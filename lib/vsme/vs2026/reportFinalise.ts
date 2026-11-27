import type { Prisma, PrismaClient } from "@prisma/client";

import { requireAuthenticatedUser, type AuthenticatedContext } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { parseReportingCurrency } from "@/lib/vsme/currency";
import { runReadinessCheckForOrganization } from "@/lib/vsme/release/readinessCheck";

import { isVS2026EditorEnabled } from "./editorAvailability";
import { evaluateVS2026ReportingState } from "./evaluation";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { getReportingConfiguration, type ReportingConfigurationDb } from "./reportingConfiguration";
import { getVS2026ReportingState, type ReviewReadiness } from "./reportingState";
import { reportingStandardFromOption, type ComparativeBasis } from "./reportingStandard";
import {
  buildVS2026ReportDataset,
  conformityStatementFor,
  proposedConformityStatement,
  VS2026_REGULATORY_VERSION,
  type ReportRowInput,
  type VS2026ReportDataset,
  type VS2026ReportPanel,
} from "./reportDataset";
import { hashReportDataset, renderDraftReportFile, renderFinalReportFile } from "./reportJson";
import { lockVs2026ReportingPeriod } from "./reportLock";
import { renderVS2026Pdf } from "./reportPdf";
import { ReportRenderLimitError } from "./reportPublication";
import { buildSnapshotSeal, verifyStoredSnapshot, VS2026_INTEGRITY_SCHEME_2 } from "./reportSeal";
import { renderVS2026Xlsx } from "./reportXlsx";

export type FinaliseCode =
  | "EDITOR_DISABLED"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "DATABASE_FAILURE"
  | "NOT_CONFIGURED"
  | "INVALID_REPORTING_STATE"
  | "OPTION_B_UNSUPPORTED"
  | "UNSUPPORTED_COMPREHENSIVE"
  | "LEGACY_VALUE_PROVENANCE"
  | "COMPARATIVE_BASIS_UNSUPPORTED"
  | "NOT_READY"
  | "CONFIRMATION_REQUIRED"
  | "INTEGRITY_FAILURE"
  | "UNSUPPORTED_FORMAT"
  | "REPORT_TOO_LARGE";

export type FinaliseResult =
  | { ok: true; snapshotId: string; revision: number; contentHash: string; repeated: boolean }
  | { ok: false; code: FinaliseCode; message: string };

type Caller = {
  request: Request;
  reportingPeriodId: string;
  db?: ReportingConfigurationDb;
  resolveIdentity?: (request: Request) => Promise<AuthenticatedContext | null>;
  isEnabled?: (env: NodeJS.ProcessEnv) => boolean;
};

type DecisionInput = {
  configuration: "LEGACY" | "INVALID" | "OPTION_A" | "OPTION_B";
  additionalComprehensiveDisclosures: readonly string[];
  readiness: ReviewReadiness;
  comparativeBasis: ComparativeBasis;
  provenanceFieldIds: readonly string[];
  confirmed: boolean;
};

const NO_STORE = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

export function finalisationDecision(input: DecisionInput): { code: FinaliseCode; message: string } | null {
  if (input.configuration === "LEGACY") {
    return {
      code: "NOT_CONFIGURED",
      message:
        "This reporting period has no VS 2026 option. It remains a legacy VSME period and cannot be finalised as a VS 2026 report.",
    };
  }
  if (input.configuration === "INVALID") {
    return {
      code: "INVALID_REPORTING_STATE",
      message: "This reporting period has an unrecognised reporting standard and was not finalised.",
    };
  }
  if (input.configuration === "OPTION_B") {
    return {
      code: "OPTION_B_UNSUPPORTED",
      message: "Option B cannot be finalised. Comprehensive disclosures are not implemented.",
    };
  }
  if (input.additionalComprehensiveDisclosures.length > 0) {
    return {
      code: "UNSUPPORTED_COMPREHENSIVE",
      message:
        "Selected Comprehensive disclosures have no verified inclusion path. Finalisation is blocked. The reporting option was not changed.",
    };
  }
  if (input.provenanceFieldIds.length > 0) {
    return {
      code: "LEGACY_VALUE_PROVENANCE",
      message:
        "A stored value has no verified VS 2026 origin, so it was not used as a reported fact. Use a clean VS 2026 period or re-save the value in the VS 2026 editor. Historical values were not imported.",
    };
  }
  if (input.comparativeBasis !== "FIRST_YEAR") {
    return {
      code: "COMPARATIVE_BASIS_UNSUPPORTED",
      message:
        input.comparativeBasis === "SUBSEQUENT"
          ? "Subsequent-year reporting is not finalised in this LibreVS version. Comparative figures are not produced, and previous-year values are not invented."
          : "Finalisation requires an explicit first-year reporting declaration. The reporting year does not establish that basis.",
    };
  }
  if (input.readiness !== "READY_FOR_REVIEW") {
    return {
      code: "NOT_READY",
      message: `The report is not ready for finalisation (${input.readiness}). Resolve the review issues first.`,
    };
  }
  if (input.confirmed !== true) {
    return {
      code: "CONFIRMATION_REQUIRED",
      message: "Finalisation requires an explicit confirmation by the authenticated user.",
    };
  }
  return null;
}

export async function finaliseVS2026Report(
  input: Caller & { confirmed: boolean },
): Promise<FinaliseResult> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  const opened = await openPeriod(input, enabled);
  if (!opened.ok) {
    return opened.result;
  }
  try {
    await runReadinessCheckForOrganization(opened.identity.organizationId);
  } catch {
    return fail("DATABASE_FAILURE", "The report could not be finalised because the database was unavailable.");
  }
  try {
    return await inTransaction(opened.db, async (tx) => {
      await lockVs2026ReportingPeriod(tx, opened.reportingPeriodId);
      const assembled = await assembleDataset(tx, opened);
      if (!assembled.ok) {
        return assembled.result;
      }
      const decision = finalisationDecision({
        configuration: "OPTION_A",
        additionalComprehensiveDisclosures: assembled.additional,
        readiness: assembled.dataset.validation.readiness,
        comparativeBasis: assembled.dataset.validation.comparativeBasis,
        provenanceFieldIds: assembled.dataset.validation.provenanceExclusions,
        confirmed: input.confirmed,
      });
      if (decision) {
        return { ok: false, code: decision.code, message: decision.message };
      }
      const statement = conformityStatementFor(
        proposedConformityStatement({ undertakingName: opened.undertakingName, year: opened.year }),
      );
      const dataset: VS2026ReportDataset = {
        ...assembled.dataset,
        metadata: { ...assembled.dataset.metadata, status: "FINAL" },
        conformityStatement: statement,
      };
      const contentHash = hashReportDataset(dataset);
      const stored = await persistSnapshot(tx, {
        reportingPeriodId: opened.reportingPeriodId,
        organizationId: opened.identity.organizationId,
        companyId: assembled.companyId,
        dataset,
        conformityStatement: statement.text,
        contentHash,
        finalisedByUserId: opened.identity.userId,
      });
      return {
        ok: true,
        snapshotId: stored.id,
        revision: stored.revision,
        contentHash: stored.contentHash,
        repeated: stored.repeated,
      };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The report could not be finalised because the database was unavailable.");
  }
}

export async function buildVS2026DraftDownload(input: Caller): Promise<
  | { ok: true; body: string; filename: string }
  | { ok: false; code: FinaliseCode; message: string }
> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  const opened = await openPeriod(input, enabled);
  if (!opened.ok) {
    return opened.result;
  }
  try {
    return await inTransaction(opened.db, async (tx) => {
      await lockVs2026ReportingPeriod(tx, opened.reportingPeriodId);
      const assembled = await assembleDataset(tx, opened);
      if (!assembled.ok) {
        return assembled.result;
      }
      if (assembled.dataset.metadata.reportingOption !== "OPTION_A") {
        return fail("NOT_CONFIGURED", "A draft VS 2026 report is available for Option A periods.");
      }
      return {
        ok: true,
        body: renderDraftReportFile(assembled.dataset),
        filename: "vs2026-option-a-draft.json",
      };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The draft report could not be built because the database was unavailable.");
  }
}

export type ReportDownloadFormat = "json" | "xlsx" | "pdf";

export function parseReportDownloadFormat(value: string | null): ReportDownloadFormat | null {
  if (value === null || value === "" || value === "json") {
    return "json";
  }
  if (value === "xlsx" || value === "pdf") {
    return value;
  }
  return null;
}

export async function readFinalVS2026ReportDownload(
  input: Omit<Caller, "reportingPeriodId"> & { snapshotId: string; format?: "json" },
): Promise<{ ok: true; body: string; filename: string; contentType: string } | { ok: false; code: FinaliseCode; message: string }>;
export async function readFinalVS2026ReportDownload(
  input: Omit<Caller, "reportingPeriodId"> & { snapshotId: string; format: "xlsx" | "pdf" },
): Promise<{ ok: true; body: Uint8Array; filename: string; contentType: string } | { ok: false; code: FinaliseCode; message: string }>;
export async function readFinalVS2026ReportDownload(
  input: Omit<Caller, "reportingPeriodId"> & { snapshotId: string; format?: ReportDownloadFormat },
): Promise<
  | { ok: true; body: string | Uint8Array; filename: string; contentType: string }
  | { ok: false; code: FinaliseCode; message: string }
>;
export async function readFinalVS2026ReportDownload(
  input: Omit<Caller, "reportingPeriodId"> & { snapshotId: string; format?: ReportDownloadFormat },
): Promise<
  | { ok: true; body: string | Uint8Array; filename: string; contentType: string }
  | { ok: false; code: FinaliseCode; message: string }
> {
  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity || identity.organizationId.trim() === "") {
    return fail("UNAUTHENTICATED", "Sign-in is required.");
  }
  const snapshotId = input.snapshotId.trim();
  if (snapshotId === "") {
    return fail("NOT_FOUND", "Report snapshot not found.");
  }
  const format = input.format ?? "json";
  const db = input.db ?? prisma;
  try {
    const snapshot = await db.vs2026ReportSnapshot.findFirst({
      where: { id: snapshotId, organizationId: identity.organizationId },
    });
    if (!snapshot) {
      return fail("NOT_FOUND", "Report snapshot not found.");
    }
    const verified = verifyStoredSnapshot(snapshot);
    if (!verified.ok) {
      return fail("INTEGRITY_FAILURE", "The stored report snapshot failed its integrity check.");
    }
    const filename = `vs2026-option-a-r${snapshot.revision}.${format === "xlsx" ? "xlsx" : format}`;
    if (format === "json") {
      return {
        ok: true,
        body: renderFinalReportFile({
          snapshotId: snapshot.id,
          revision: snapshot.revision,
          finalisedAt: snapshot.finalisedAt.toISOString(),
          finalisedByUserId: snapshot.finalisedByUserId,
          contentHash: snapshot.contentHash,
          dataset: verified.snapshot.dataset,
        }),
        filename,
        contentType: "application/json; charset=utf-8",
      };
    }
    const body = format === "pdf" ? await renderVS2026Pdf(verified.snapshot) : await renderVS2026Xlsx(verified.snapshot);
    return {
      ok: true,
      body,
      filename,
      contentType:
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    if (error instanceof ReportRenderLimitError) {
      return fail("REPORT_TOO_LARGE", error.message);
    }
    if (error instanceof Error && error.message.includes("undertaking declaration")) {
      return fail("INTEGRITY_FAILURE", "The stored report snapshot failed its integrity check.");
    }
    return fail("DATABASE_FAILURE", "The report could not be read because the database was unavailable.");
  }
}

export async function loadVS2026ReportPanel(input: Caller): Promise<VS2026ReportPanel | null> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  const opened = await openPeriod(input, enabled);
  if (!opened.ok) {
    return null;
  }
  const snapshots = await opened.db.vs2026ReportSnapshot.findMany({
    where: { reportingPeriodId: opened.reportingPeriodId, organizationId: opened.identity.organizationId },
    orderBy: { revision: "asc" },
    select: { id: true, revision: true, finalisedAt: true, contentHash: true },
  });
  return {
    currency: opened.currency,
    proposedStatement: proposedConformityStatement({
      undertakingName: opened.undertakingName,
      year: opened.year,
    }),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      revision: snapshot.revision,
      finalisedAt: snapshot.finalisedAt.toISOString(),
      contentHash: snapshot.contentHash,
    })),
  };
}

export function reportDownloadHeaders(filename: string, contentType = "application/json; charset=utf-8"): Headers {
  const headers = new Headers(NO_STORE);
  headers.set("content-type", contentType);
  headers.set("content-disposition", `attachment; filename="${filename}"`);
  return headers;
}

type Opened =
  | {
      ok: true;
      db: ReportingConfigurationDb;
      identity: AuthenticatedContext;
      reportingPeriodId: string;
      year: number | null;
      undertakingName: string;
      currency: string;
      companyId: string;
    }
  | { ok: false; result: { ok: false; code: FinaliseCode; message: string } };

async function openPeriod(
  input: Caller,
  enabled: (env: NodeJS.ProcessEnv) => boolean,
): Promise<Opened> {
  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity || identity.organizationId.trim() === "") {
    return { ok: false, result: fail("UNAUTHENTICATED", "Sign-in is required.") };
  }
  const reportingPeriodId = input.reportingPeriodId.trim();
  if (reportingPeriodId === "") {
    return { ok: false, result: fail("NOT_FOUND", "Reporting period not found.") };
  }
  const db = input.db ?? prisma;
  const period = await db.reportingPeriod.findFirst({
    where: { id: reportingPeriodId, company: { organizationId: identity.organizationId } },
    select: {
      id: true,
      year: true,
      companyId: true,
      company: { select: { name: true, currency: true } },
    },
  });
  if (!period) {
    return { ok: false, result: fail("NOT_FOUND", "Reporting period not found.") };
  }
  if (!enabled(process.env)) {
    return { ok: false, result: fail("EDITOR_DISABLED", "The VS 2026 editor is not enabled.") };
  }
  return {
    ok: true,
    db,
    identity,
    reportingPeriodId,
    year: period.year,
    undertakingName: period.company.name,
    currency: parseReportingCurrency(period.company.currency),
    companyId: period.companyId,
  };
}

async function assembleDataset(
  db: ReportingConfigurationDb,
  opened: Extract<Opened, { ok: true }>,
): Promise<
  | { ok: true; dataset: VS2026ReportDataset; companyId: string; additional: readonly string[] }
  | { ok: false; result: { ok: false; code: FinaliseCode; message: string } }
> {
  const access = { reportingPeriodId: opened.reportingPeriodId, organizationId: opened.identity.organizationId };
  const configuration = await getReportingConfiguration(access, db);
  if (!configuration.ok) {
    if (configuration.reason === "STORED_CONFIGURATION_INVALID") {
      return { ok: false, result: fail("INVALID_REPORTING_STATE", "The stored reporting configuration cannot be reported.") };
    }
    return { ok: false, result: fail("NOT_FOUND", "Reporting period not found.") };
  }
  const storedOption =
    configuration.configuration.status === "CONFIGURED" ? configuration.configuration.reportingOption : null;
  const standard = reportingStandardFromOption(storedOption);
  const additional =
    configuration.configuration.status === "CONFIGURED"
      ? configuration.configuration.additionalComprehensiveDisclosures
      : [];
  if (standard.kind !== "VS2026" || standard.option !== "OPTION_A") {
    const decision = finalisationDecision({
      configuration: standard.kind === "VS2026" ? standard.option : standard.kind === "INVALID" ? "INVALID" : "LEGACY",
      additionalComprehensiveDisclosures: additional,
      readiness: "NOT_CONFIGURED",
      comparativeBasis: "UNKNOWN",
      provenanceFieldIds: [],
      confirmed: false,
    });
    return {
      ok: false,
      result: decision
        ? { ok: false, code: decision.code, message: decision.message }
        : fail("NOT_CONFIGURED", "This period cannot be reported as VS 2026 Option A."),
    };
  }
  const state = await getVS2026ReportingState({
    reportingPeriodId: opened.reportingPeriodId,
    request: new Request("http://localhost/vsme/vs2026/report"),
    db,
    resolveIdentity: async () => opened.identity,
    isEnabled: () => true,
  });
  if (!state.ok) {
    return {
      ok: false,
      result: fail(
        state.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : state.code === "UNAUTHENTICATED"
            ? "UNAUTHENTICATED"
            : state.code === "EDITOR_DISABLED"
              ? "EDITOR_DISABLED"
              : "DATABASE_FAILURE",
        state.message,
      ),
    };
  }
  const loaded = await loadVS2026EvaluationInput(access, db);
  if (!loaded.ok) {
    return {
      ok: false,
      result: fail("INVALID_REPORTING_STATE", "Stored reporting data could not be read as a VS 2026 report."),
    };
  }
  const rows: ReportRowInput[] = loaded.loaded.rows.map((row) => ({
    rowId: row.rowId,
    groupId: row.groupId,
    position: row.position,
    cells: row.cells.map((cell) => ({
      datapointId: cell.datapointId,
      dimensionMember: cell.dimensionMember,
      value: cell.value,
      unit: cell.unit,
    })),
  }));
  const evaluated = evaluateVS2026ReportingState(loaded.loaded.input);
  const dataset = buildVS2026ReportDataset({
    reportingPeriodId: opened.reportingPeriodId,
    year: opened.year,
    undertakingName: opened.undertakingName,
    currency: opened.currency,
    comparativeBasis: state.review.comparativeBasis,
    report: evaluated,
    review: state.review,
    rows,
    omissions: loaded.loaded.input.omissions ?? [],
    provenanceExclusions: state.review.issues
      .filter((item) => item.code === "LEGACY_VALUE_PROVENANCE" && item.datapointId)
      .map((item) => item.datapointId as string),
    status: "DRAFT",
    conformityStatement: null,
  });
  return { ok: true, dataset, companyId: opened.companyId, additional };
}

async function persistSnapshot(
  db: ReportingConfigurationDb,
  input: {
    reportingPeriodId: string;
    organizationId: string;
    companyId: string;
    dataset: VS2026ReportDataset;
    conformityStatement: string;
    contentHash: string;
    finalisedByUserId: string;
  },
): Promise<{ id: string; revision: number; contentHash: string; repeated: boolean }> {
  const existing = await db.vs2026ReportSnapshot.findFirst({
    where: { reportingPeriodId: input.reportingPeriodId, contentHash: input.contentHash },
    orderBy: { revision: "desc" },
  });
  if (existing) {
    return { id: existing.id, revision: existing.revision, contentHash: existing.contentHash, repeated: true };
  }
  const latest = await db.vs2026ReportSnapshot.aggregate({
    where: { reportingPeriodId: input.reportingPeriodId },
    _max: { revision: true },
  });
  const revision = (latest._max.revision ?? 0) + 1;
  const finalisedAt = new Date();
  const sealed = buildSnapshotSeal({
    dataset: input.dataset,
    reportingPeriodId: input.reportingPeriodId,
    organizationId: input.organizationId,
    companyId: input.companyId,
    revision,
    regulatoryVersion: VS2026_REGULATORY_VERSION,
    reportingOption: "OPTION_A",
    conformityStatement: input.conformityStatement,
    finalisedByUserId: input.finalisedByUserId,
    finalisedAt: finalisedAt.toISOString(),
  });
  try {
    const created = await db.vs2026ReportSnapshot.create({
      data: {
        reportingPeriodId: input.reportingPeriodId,
        organizationId: input.organizationId,
        companyId: input.companyId,
        revision,
        regulatoryVersion: VS2026_REGULATORY_VERSION,
        reportingOption: "OPTION_A",
        dataset: input.dataset as Prisma.InputJsonValue,
        conformityStatement: input.conformityStatement,
        contentHash: sealed.datasetHash,
        integrityVersion: VS2026_INTEGRITY_SCHEME_2,
        sealHash: sealed.sealHash,
        finalisedByUserId: input.finalisedByUserId,
        finalisedAt,
      },
    });
    return { id: created.id, revision: created.revision, contentHash: created.contentHash, repeated: false };
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) {
      throw error;
    }
    const winner = await db.vs2026ReportSnapshot.findFirst({
      where: { reportingPeriodId: input.reportingPeriodId, contentHash: input.contentHash },
      orderBy: { revision: "desc" },
    });
    if (!winner) {
      throw error;
    }
    return { id: winner.id, revision: winner.revision, contentHash: winner.contentHash, repeated: true };
  }
}

function fail(code: FinaliseCode, message: string): { ok: false; code: FinaliseCode; message: string } {
  return { ok: false, code, message };
}

function isPrismaClient(db: ReportingConfigurationDb): db is PrismaClient {
  return "$connect" in db;
}

async function inTransaction<T>(db: ReportingConfigurationDb, fn: (tx: ReportingConfigurationDb) => Promise<T>): Promise<T> {
  if (isPrismaClient(db)) {
    return db.$transaction(fn, { timeout: 30_000 });
  }
  return fn(db);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
