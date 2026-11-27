import type { PrismaClient } from "@prisma/client";

import { requireAuthenticatedUser, type AuthenticatedContext } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

import { isVS2026EditorEnabled } from "./editorAvailability";
import type { EditorMutationResult } from "./editorView";
import { classifyEmployeeSize, VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { VS2026_COMPARATIVE_BASIS, VS2026_REPORTING_ORIGIN } from "./reportingStandard";
import {
  getReportingConfiguration,
  saveReportingConfiguration,
  type ReportingConfigurationDb,
  type ReportingPeriodAccess,
} from "./reportingConfiguration";
import { lockVs2026ReportingPeriod } from "./reportLock";
import { registryDatapoint, validateScalarWrite } from "./scalarEligibility";

const EMPLOYEE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export type EditorCaller = {
  request: Request;
  reportingPeriodId: string;
  db?: ReportingConfigurationDb;
  resolveIdentity?: (request: Request) => Promise<AuthenticatedContext | null>;
  isEnabled?: (env: NodeJS.ProcessEnv) => boolean;
};

type Authorized =
  | {
      ok: true;
      access: ReportingPeriodAccess;
      userId: string;
      db: ReportingConfigurationDb;
    }
  | { ok: false; result: EditorMutationResult };

function fail(code: string, message: string): EditorMutationResult {
  return { ok: false, code, message };
}

function isPrismaClient(db: ReportingConfigurationDb): db is PrismaClient {
  return "$connect" in db;
}

async function authorize(input: EditorCaller): Promise<Authorized> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  if (!enabled(process.env)) {
    return {
      ok: false,
      result: fail("EDITOR_DISABLED", "The VS 2026 editor is not enabled."),
    };
  }
  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity || identity.organizationId.trim() === "") {
    return { ok: false, result: fail("UNAUTHENTICATED", "Sign-in is required.") };
  }
  const reportingPeriodId = input.reportingPeriodId.trim();
  if (reportingPeriodId === "") {
    return { ok: false, result: fail("PERIOD_NOT_FOUND", "Reporting period not found.") };
  }
  return {
    ok: true,
    access: { reportingPeriodId, organizationId: identity.organizationId },
    userId: identity.userId,
    db: input.db ?? prisma,
  };
}

async function inTransaction<T>(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
  fn: (tx: ReportingConfigurationDb) => Promise<T>,
): Promise<T> {
  const run = async (tx: ReportingConfigurationDb) => {
    await lockVs2026ReportingPeriod(tx, reportingPeriodId);
    return fn(tx);
  };
  if (isPrismaClient(db)) {
    return db.$transaction(run);
  }
  return run(db);
}

type PeriodMode =
  | { ok: true; mode: "NOT_CONFIGURED" | "OPTION_A" | "OPTION_B"; additional: readonly string[] }
  | { ok: false; result: EditorMutationResult };

async function readPeriodMode(
  access: ReportingPeriodAccess,
  db: ReportingConfigurationDb,
): Promise<PeriodMode> {
  const current = await getReportingConfiguration(access, db);
  if (!current.ok) {
    if (current.reason === "PERIOD_NOT_FOUND") {
      return { ok: false, result: fail("PERIOD_NOT_FOUND", "Reporting period not found.") };
    }
    if (current.reason === "STORED_CONFIGURATION_INVALID") {
      return {
        ok: false,
        result: fail(
          "STORED_CONFIGURATION_INVALID",
          "The stored reporting configuration cannot be edited. It was not changed.",
        ),
      };
    }
    return { ok: false, result: fail("UNAUTHENTICATED", "Sign-in is required.") };
  }
  if (current.configuration.status === "NOT_CONFIGURED") {
    return { ok: true, mode: "NOT_CONFIGURED", additional: [] };
  }
  return {
    ok: true,
    mode: current.configuration.reportingOption,
    additional: current.configuration.additionalComprehensiveDisclosures,
  };
}

export async function saveVs2026OptionA(input: EditorCaller): Promise<EditorMutationResult> {
  const gate = await authorize(input);
  if (!gate.ok) {
    return gate.result;
  }
  try {
    return await inTransaction(gate.db, gate.access.reportingPeriodId, async (tx) => {
      const mode = await readPeriodMode(gate.access, tx);
      if (!mode.ok) {
        return mode.result;
      }
      if (mode.mode === "OPTION_B") {
        return fail(
          "OPTION_B_UNCHANGED",
          "Option B is stored. It was not changed, and Option A was not applied.",
        );
      }
      const additional = [...mode.additional];
      const saved = await saveReportingConfiguration(
        gate.access,
        {
          reportingOption: "OPTION_A",
          additionalComprehensiveDisclosures: additional,
        },
        tx,
      );
      if (!saved.ok || saved.configuration.status !== "CONFIGURED") {
        return fail("WRITE_NOT_CONFIRMED", "The reporting option was not saved.");
      }
      if (saved.configuration.reportingOption !== "OPTION_A") {
        return fail("WRITE_NOT_CONFIRMED", "The reporting option was not saved.");
      }
      const confirmed = await getReportingConfiguration(gate.access, tx);
      if (
        !confirmed.ok ||
        confirmed.configuration.status !== "CONFIGURED" ||
        confirmed.configuration.reportingOption !== "OPTION_A" ||
        confirmed.configuration.additionalComprehensiveDisclosures.join("\0") !==
          additional.join("\0")
      ) {
        return fail("WRITE_NOT_CONFIRMED", "The reporting option was not saved.");
      }
      return { ok: true, code: "SAVED" };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The reporting option was not saved.");
  }
}

export async function saveVs2026EmployeeMeasure(
  input: EditorCaller & { value: string | null; confirmed: boolean },
): Promise<EditorMutationResult> {
  const gate = await authorize(input);
  if (!gate.ok) {
    return gate.result;
  }
  try {
    return await inTransaction(gate.db, gate.access.reportingPeriodId, async (tx) => {
      const mode = await readPeriodMode(gate.access, tx);
      if (!mode.ok) {
        return mode.result;
      }
      if (mode.mode === "OPTION_B") {
        return fail("OPTION_B_UNSUPPORTED", "Option B is stored. Facts were not changed.");
      }
      if (mode.mode !== "OPTION_A") {
        return fail("CONFIGURATION_REQUIRED", "Save Option A before entering this measure.");
      }
      if (input.confirmed !== true) {
        return fail(
          "CONFIRMATION_REQUIRED",
          "Confirm the proportionality measure before saving it. The confirmation is not stored.",
        );
      }
      const parsed = parseEmployeeMeasure(input.value);
      if (!parsed.ok) {
        return parsed.result;
      }
      const written = await writeScalarRow(tx, gate.access.reportingPeriodId, {
        fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
        value: parsed.value,
        unit: null,
      });
      if (!written.ok) {
        return written.result;
      }
      if (parsed.value === null) {
        return { ok: true, code: written.code, employeeCategory: "NOT_PROVIDED" };
      }
      const category = classifyEmployeeSize({
        reportingPeriodId: gate.access.reportingPeriodId,
        employeeMeasure: Number(parsed.value),
        measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
      });
      if (!category.ok) {
        return fail("WRITE_NOT_CONFIRMED", "The employee measure was not saved.");
      }
      return { ok: true, code: written.code, employeeCategory: category.category };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The employee measure was not saved.");
  }
}

export async function saveVs2026ComparativeBasis(
  input: EditorCaller & { value: "FIRST_YEAR" | "SUBSEQUENT" | null; confirmed: boolean },
): Promise<EditorMutationResult> {
  const gate = await authorize(input);
  if (!gate.ok) {
    return gate.result;
  }
  try {
    return await inTransaction(gate.db, gate.access.reportingPeriodId, async (tx) => {
      const mode = await readPeriodMode(gate.access, tx);
      if (!mode.ok) {
        return mode.result;
      }
      if (mode.mode === "OPTION_B") {
        return fail("OPTION_B_UNSUPPORTED", "Option B is stored. Facts were not changed.");
      }
      if (mode.mode !== "OPTION_A") {
        return fail("CONFIGURATION_REQUIRED", "Save Option A before recording the reporting year.");
      }
      if (input.confirmed !== true) {
        return fail(
          "CONFIRMATION_REQUIRED",
          "Confirm the reporting-year basis before saving it. The confirmation is not stored.",
        );
      }
      if (input.value !== null && input.value !== "FIRST_YEAR" && input.value !== "SUBSEQUENT") {
        return fail("INVALID_VALUE", "Choose the first reporting year or a subsequent reporting year.");
      }
      const written = await writeScalarRow(tx, gate.access.reportingPeriodId, {
        fieldId: VS2026_COMPARATIVE_BASIS,
        value: input.value,
        unit: null,
      });
      if (!written.ok) {
        return written.result;
      }
      return { ok: true, code: written.code, updatedAt: written.updatedAt };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The reporting-year basis was not saved.");
  }
}

export async function saveVs2026EditorScalar(
  input: EditorCaller & {
    datapointId: string;
    value: string | null;
    expectedUpdatedAt?: string | null;
    overwrite?: boolean;
  },
): Promise<EditorMutationResult> {
  const gate = await authorize(input);
  if (!gate.ok) {
    return gate.result;
  }
  const datapointId = input.datapointId.trim();
  try {
    return await inTransaction(gate.db, gate.access.reportingPeriodId, async (tx) => {
      const mode = await readPeriodMode(gate.access, tx);
      if (!mode.ok) {
        return mode.result;
      }
      if (mode.mode === "OPTION_B") {
        return fail("OPTION_B_UNSUPPORTED", "Option B is stored. Facts were not changed.");
      }
      if (mode.mode !== "OPTION_A") {
        return fail("CONFIGURATION_REQUIRED", "Save Option A before entering facts.");
      }
      if (datapointId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE) {
        return fail("NOT_EDITABLE", "The employee proportionality measure has its own input.");
      }
      if (datapointId === VS2026_COMPARATIVE_BASIS) {
        return fail("NOT_EDITABLE", "The comparative basis has its own confirmation.");
      }
      const datapoint = registryDatapoint(datapointId);
      if (!datapoint) {
        return fail("UNKNOWN_DATAPOINT", "This field is not an editable VS 2026 datapoint.");
      }
      const validated = validateScalarWrite(datapoint, input.value);
      if (!validated.ok) {
        return fail(validated.code, validated.message);
      }
      const written = await writeScalarRow(tx, gate.access.reportingPeriodId, {
        fieldId: datapoint.id,
        value: validated.value,
        unit: validated.unit,
        expectedUpdatedAt: input.overwrite === true ? undefined : input.expectedUpdatedAt,
      });
      if (!written.ok) {
        return written.result;
      }
      return { ok: true, code: written.code, updatedAt: written.updatedAt };
    });
  } catch {
    return fail("DATABASE_FAILURE", "The value was not saved.");
  }
}

export async function runOptionAMutation(
  input: EditorCaller,
  mutate: (
    tx: ReportingConfigurationDb,
    access: ReportingPeriodAccess,
    userId: string,
  ) => Promise<EditorMutationResult>,
): Promise<EditorMutationResult> {
  const gate = await authorize(input);
  if (!gate.ok) {
    return gate.result;
  }
  try {
    return await inTransaction(gate.db, gate.access.reportingPeriodId, async (tx) => {
      const mode = await readPeriodMode(gate.access, tx);
      if (!mode.ok) {
        return mode.result;
      }
      if (mode.mode === "OPTION_B") {
        return fail("OPTION_B_UNSUPPORTED", "Option B is stored. Facts were not changed.");
      }
      if (mode.mode !== "OPTION_A") {
        return fail("CONFIGURATION_REQUIRED", "Save Option A before entering facts.");
      }
      return mutate(tx, gate.access, gate.userId);
    });
  } catch (error) {
    if (isPrismaCode(error, "P2003")) {
      return fail(
        "SITE_REFERENCED",
        "This site is referenced by other disclosures. Remove or update those references before deleting the site.",
      );
    }
    if (isPrismaCode(error, "P2002")) {
      return fail("DUPLICATE_FACT", "That value is already stored for this row.");
    }
    return fail("DATABASE_FAILURE", "The change was not saved.");
  }
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function parseEmployeeMeasure(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; result: EditorMutationResult } {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();
  if (!EMPLOYEE_DECIMAL.test(trimmed) || !Number.isFinite(Number(trimmed))) {
    return {
      ok: false,
      result: fail("INVALID_VALUE", "Enter a non-negative number, or leave the measure empty."),
    };
  }
  return { ok: true, value: trimmed };
}

type RowWrite =
  | { ok: true; code: "SAVED" | "CLEARED"; updatedAt: string | null }
  | { ok: false; result: EditorMutationResult };

const STALE_WRITE =
  "This value changed after you opened it. Your draft is still here. Reload the stored value before replacing it, or choose to replace the stored value.";

function sameVersion(
  existing: { updatedAt: Date } | null,
  expected: string | null | undefined,
): boolean {
  if (expected === undefined) {
    return true;
  }
  return (existing ? existing.updatedAt.toISOString() : null) === expected;
}

async function writeScalarRow(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
  fact: {
    fieldId: string;
    value: string | null;
    unit: string | null;
    expectedUpdatedAt?: string | null;
  },
): Promise<RowWrite> {
  const existing = await db.sustainabilityDataPoint.findUnique({
    where: {
      reportingPeriodId_fieldId: { reportingPeriodId, fieldId: fact.fieldId },
    },
  });
  if (isProtectedRow(existing)) {
    return {
      ok: false,
      result: fail(
        "LEGACY_ROW_PROTECTED",
        "A stored value from the running VSME workspace was not overwritten.",
      ),
    };
  }

  if (!sameVersion(existing, fact.expectedUpdatedAt)) {
    return { ok: false, result: fail("CONFLICT", STALE_WRITE) };
  }

  if (fact.value === null) {
    if (!existing) {
      return { ok: true, code: "CLEARED", updatedAt: null };
    }
    const deleted = await db.sustainabilityDataPoint.deleteMany({
      where: {
        id: existing.id,
        reportingPeriodId,
        fieldId: fact.fieldId,
        legacyFieldId: null,
        migratedFieldId: null,
        migrationStatus: null,
      },
    });
    if (deleted.count !== 1) {
      return {
        ok: false,
        result: fail(
          "LEGACY_ROW_PROTECTED",
          "A stored value from the running VSME workspace was not overwritten.",
        ),
      };
    }
    const after = await db.sustainabilityDataPoint.findUnique({
      where: { reportingPeriodId_fieldId: { reportingPeriodId, fieldId: fact.fieldId } },
    });
    if (after) {
      return { ok: false, result: fail("WRITE_NOT_CONFIRMED", "The value was not cleared.") };
    }
    return { ok: true, code: "CLEARED", updatedAt: null };
  }

  if (existing) {
    const updated = await db.sustainabilityDataPoint.updateMany({
      where: {
        id: existing.id,
        reportingPeriodId,
        fieldId: fact.fieldId,
        legacyFieldId: null,
        migratedFieldId: null,
        migrationStatus: null,
      },
      data: {
        value: fact.value,
        unit: fact.unit,
        reportingOrigin: VS2026_REPORTING_ORIGIN,
        updatedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      return {
        ok: false,
        result: fail(
          "LEGACY_ROW_PROTECTED",
          "A stored value from the running VSME workspace was not overwritten.",
        ),
      };
    }
  } else {
    await db.sustainabilityDataPoint.create({
      data: {
        reportingPeriodId,
        fieldId: fact.fieldId,
        value: fact.value,
        unit: fact.unit,
        reportingOrigin: VS2026_REPORTING_ORIGIN,
      },
    });
  }

  const after = await db.sustainabilityDataPoint.findUnique({
    where: { reportingPeriodId_fieldId: { reportingPeriodId, fieldId: fact.fieldId } },
  });
  if (!after || after.value !== fact.value || (after.unit ?? null) !== fact.unit) {
    return { ok: false, result: fail("WRITE_NOT_CONFIRMED", "The value was not saved.") };
  }
  if (isProtectedRow(after)) {
    return {
      ok: false,
      result: fail(
        "LEGACY_ROW_PROTECTED",
        "A stored value from the running VSME workspace was not overwritten.",
      ),
    };
  }
  return { ok: true, code: "SAVED", updatedAt: after.updatedAt.toISOString() };
}

function isProtectedRow(
  row: {
    legacyFieldId: string | null;
    migratedFieldId: string | null;
    migrationStatus: string | null;
  } | null,
): boolean {
  return (
    row !== null &&
    (row.legacyFieldId !== null || row.migratedFieldId !== null || row.migrationStatus !== null)
  );
}
