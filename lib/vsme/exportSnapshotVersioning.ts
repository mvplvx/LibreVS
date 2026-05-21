import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import type { ExportValidationResult } from "./validateEfragExport";
import type { VsmeExportRow, VsmeExportValidationResult } from "./exportMapping";
import { VSME_SCHEMA_VERSION } from "./schemaVersion";

export type ExportSnapshotAuditTrail = {
  schemaVersion: string;
  userId: string;
  organizationId: string;
  year: number;
  employeeCount: number;
  rowCount: number;
  includedFieldCount: number;
  exportReady: boolean;
  efragValid: boolean;
  generatedAt: string;
  previousSnapshotId: string | null;
  finalizedAt?: string | null;
  finalizedByUserId?: string | null;
};

export type ExportSnapshotStatePayload = {
  audit: ExportSnapshotAuditTrail;
  reportingPeriodId: string;
  companyId: string;
  year: number;
  status: string;
  schemaVersion: string;
  employeeCount: number;
  materialityByFieldId: Record<string, string>;
  valuesByFieldId: Record<string, string>;
  completeness: unknown;
  reportingState: string;
};

export type ExportSnapshotExportPayload = {
  exportReady: boolean;
  rows: VsmeExportRow[];
};

export type ExportSnapshotValidationPayload = {
  efrag: ExportValidationResult;
  export: VsmeExportValidationResult;
};

export class ExportSnapshotLockedError extends Error {
  readonly code = "EXPORT_SNAPSHOT_LOCKED";
  readonly finalVersion: number;
  readonly finalSnapshotId: string;

  constructor(finalSnapshotId: string, finalVersion: number) {
    super(
      `Reporting period is locked by final export snapshot v${finalVersion}`
    );
    this.name = "ExportSnapshotLockedError";
    this.finalSnapshotId = finalSnapshotId;
    this.finalVersion = finalVersion;
  }
}

export async function findFinalExportSnapshot(reportingPeriodId: string) {
  return prisma.vsmeExportSnapshot.findFirst({
    where: { reportingPeriodId, isFinal: true },
    orderBy: { version: "desc" },
  });
}

export async function assertPeriodExportNotLocked(
  reportingPeriodId: string
): Promise<void> {
  const final = await findFinalExportSnapshot(reportingPeriodId);
  if (final) {
    throw new ExportSnapshotLockedError(final.id, final.version);
  }
}

export async function getNextExportSnapshotVersion(
  reportingPeriodId: string
): Promise<number> {
  const agg = await prisma.vsmeExportSnapshot.aggregate({
    where: { reportingPeriodId },
    _max: { version: true },
  });
  return (agg._max.version ?? 0) + 1;
}

export async function getLatestExportSnapshot(reportingPeriodId: string) {
  return prisma.vsmeExportSnapshot.findFirst({
    where: { reportingPeriodId },
    orderBy: { version: "desc" },
  });
}

type PeriodIntelligence = NonNullable<
  Awaited<ReturnType<typeof loadPeriodIntelligence>>
>;

export function buildExportSnapshotPayloads(input: {
  data: PeriodIntelligence;
  rows: VsmeExportRow[];
  exportValidation: VsmeExportValidationResult;
  efragValidation: ExportValidationResult;
  userId: string;
  organizationId: string;
  previousSnapshotId: string | null;
}): {
  stateSnapshot: ExportSnapshotStatePayload;
  exportData: ExportSnapshotExportPayload;
  validationResult: ExportSnapshotValidationPayload;
  coverage: number;
} {
  const { data, rows, exportValidation, efragValidation } = input;
  const valuesByFieldId: Record<string, string> = {};
  for (const row of data.vsme.values) {
    valuesByFieldId[row.fieldId] = row.value;
  }

  const audit: ExportSnapshotAuditTrail = {
    schemaVersion: data.schemaVersion ?? VSME_SCHEMA_VERSION,
    userId: input.userId,
    organizationId: input.organizationId,
    year: data.year,
    employeeCount: data.employeeCount,
    rowCount: rows.length,
    includedFieldCount: exportValidation.includedFieldIds.length,
    exportReady: exportValidation.exportReady,
    efragValid: efragValidation.isValid,
    generatedAt: new Date().toISOString(),
    previousSnapshotId: input.previousSnapshotId,
  };

  const stateSnapshot: ExportSnapshotStatePayload = {
    audit,
    reportingPeriodId: data.reportingPeriodId,
    companyId: data.companyId,
    year: data.year,
    status: data.status,
    schemaVersion: data.schemaVersion,
    employeeCount: data.employeeCount,
    materialityByFieldId: data.materialityByFieldId,
    valuesByFieldId,
    completeness: data.vsme.completeness,
    reportingState: data.reportingState,
  };

  return {
    stateSnapshot,
    exportData: {
      exportReady: exportValidation.exportReady,
      rows,
    },
    validationResult: {
      efrag: efragValidation,
      export: exportValidation,
    },
    coverage: data.vsme.requiredCoveragePercentage,
  };
}

/** Persist immutable export snapshot (append-only version). */
export async function createImmutableExportSnapshot(input: {
  reportingPeriodId: string;
  companyId: string;
  reportingState: string;
  stateSnapshot: ExportSnapshotStatePayload;
  exportData: ExportSnapshotExportPayload;
  validationResult: ExportSnapshotValidationPayload;
  coverage: number;
}): Promise<{ id: string; version: number; createdAt: Date }> {
  await assertPeriodExportNotLocked(input.reportingPeriodId);

  const version = await getNextExportSnapshotVersion(input.reportingPeriodId);

  const record = await prisma.vsmeExportSnapshot.create({
    data: {
      reportingPeriodId: input.reportingPeriodId,
      companyId: input.companyId,
      reportingState: input.reportingState,
      coverage: input.coverage,
      version,
      isFinal: false,
      stateSnapshot: input.stateSnapshot as unknown as Prisma.InputJsonValue,
      exportData: input.exportData as unknown as Prisma.InputJsonValue,
      validationResult:
        input.validationResult as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      version: true,
      createdAt: true,
    },
  });

  return record;
}

export async function listExportSnapshotsForPeriod(
  reportingPeriodId: string
) {
  const [snapshots, finalSnapshot] = await Promise.all([
    prisma.vsmeExportSnapshot.findMany({
      where: { reportingPeriodId },
      orderBy: { version: "asc" },
      select: {
        id: true,
        version: true,
        createdAt: true,
        isFinal: true,
        reportingState: true,
        coverage: true,
        companyId: true,
        stateSnapshot: true,
        exportData: true,
      },
    }),
    findFinalExportSnapshot(reportingPeriodId),
  ]);

  return {
    locked: !!finalSnapshot,
    finalSnapshotId: finalSnapshot?.id ?? null,
    finalVersion: finalSnapshot?.version ?? null,
    snapshots: snapshots.map((s) => {
      const state = s.stateSnapshot as ExportSnapshotStatePayload;
      const exportPayload = s.exportData as ExportSnapshotExportPayload;
      return {
        id: s.id,
        version: s.version,
        createdAt: s.createdAt.toISOString(),
        isFinal: s.isFinal,
        reportingState: s.reportingState,
        coverage: s.coverage,
        companyId: s.companyId,
        rowCount: exportPayload.rows?.length ?? 0,
        audit: state.audit,
      };
    }),
  };
}

export async function getExportSnapshotById(
  snapshotId: string,
  organizationId: string
) {
  const snapshot = await prisma.vsmeExportSnapshot.findFirst({
    where: {
      id: snapshotId,
      reportingPeriod: {
        company: { organizationId },
      },
    },
  });
  return snapshot;
}

/**
 * Mark a snapshot as the final locked export for the period.
 * Clears isFinal on other snapshots; sets period status to exported.
 */
export async function finalizeExportSnapshot(input: {
  snapshotId: string;
  organizationId: string;
  userId: string;
}): Promise<{ snapshotId: string; version: number; reportingPeriodId: string }> {
  const snapshot = await getExportSnapshotById(
    input.snapshotId,
    input.organizationId
  );
  if (!snapshot) {
    throw new Error("EXPORT_SNAPSHOT_NOT_FOUND");
  }

  if (snapshot.isFinal) {
    return {
      snapshotId: snapshot.id,
      version: snapshot.version,
      reportingPeriodId: snapshot.reportingPeriodId,
    };
  }

  const existingFinal = await findFinalExportSnapshot(snapshot.reportingPeriodId);
  if (existingFinal && existingFinal.id !== snapshot.id) {
    throw new ExportSnapshotLockedError(existingFinal.id, existingFinal.version);
  }

  const state = snapshot.stateSnapshot as ExportSnapshotStatePayload;
  const updatedAudit: ExportSnapshotAuditTrail = {
    ...state.audit,
    finalizedAt: new Date().toISOString(),
    finalizedByUserId: input.userId,
  };

  await prisma.$transaction([
    prisma.vsmeExportSnapshot.updateMany({
      where: {
        reportingPeriodId: snapshot.reportingPeriodId,
        isFinal: true,
      },
      data: { isFinal: false },
    }),
    prisma.vsmeExportSnapshot.update({
      where: { id: snapshot.id },
      data: {
        isFinal: true,
        stateSnapshot: {
          ...state,
          audit: updatedAudit,
        } as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.reportingPeriod.update({
      where: { id: snapshot.reportingPeriodId },
      data: { status: "exported" },
    }),
  ]);

  return {
    snapshotId: snapshot.id,
    version: snapshot.version,
    reportingPeriodId: snapshot.reportingPeriodId,
  };
}
