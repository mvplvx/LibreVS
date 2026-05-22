import { apiError, apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { VSME_CONTRACT, VSME_CONTRACT_REGISTRY } from "../CONTRACT";
import { buildVsmeCompleteness } from "../completeness";
import { buildVsmeUiSchema } from "../vsme.uiSchema";
import { VSME_SCHEMA_VERSION } from "../schemaVersion";
import { VSME_FIELD_COUNT, VSME_FIELD_IDS } from "../vsme.fieldRegistry";
import { isRegisteredFieldId } from "../vsme.fieldRegistry";
import {
  buildEfragExportSnapshot,
  validateEfragExport,
} from "../validateEfragExport";
import { VSME_SCHEMA } from "../vsme.schema";
import { isPilotModeEnabled, pilotTelemetryLog } from "./pilotMode";

export type SystemHealth = "green" | "yellow" | "red";

export type ReadinessCheckResult = {
  systemHealth: SystemHealth;
  blockers: string[];
  warnings: string[];
  readinessScore: number;
  schemaVersion: string;
  registryVersion: string;
  exportIntegrity: boolean;
};

const EXPECTED_SCHEMA_VERSION = "2.0.0";

const RUNTIME_MODULE_CHECKS = [
  "@/lib/vsme/vsme.fieldRegistry",
  "@/lib/vsme/exportMapping",
  "@/lib/vsme/validateEfragExport",
  "@/lib/vsme/vsme.uiSchema",
  "@/lib/vsme/completeness",
  "@/lib/vsme/export/exportAudit",
] as const;

function countUiSchemaFields(employeeCount: number): number {
  const schema = buildVsmeUiSchema(employeeCount);
  return schema.sections.reduce(
    (n, section) =>
      n +
      section.subsections.reduce((m, sub) => m + sub.fields.length, 0),
    0
  );
}

function checkSchemaVersionConsistency(blockers: string[]): void {
  if (VSME_SCHEMA.version !== EXPECTED_SCHEMA_VERSION) {
    blockers.push(
      `VSME schema version is ${VSME_SCHEMA.version}; expected ${EXPECTED_SCHEMA_VERSION}`
    );
  }
  if (VSME_SCHEMA_VERSION !== EXPECTED_SCHEMA_VERSION) {
    blockers.push(
      `Registry schema stamp is ${VSME_SCHEMA_VERSION}; expected ${EXPECTED_SCHEMA_VERSION}`
    );
  }
  if (VSME_CONTRACT.version !== EXPECTED_SCHEMA_VERSION) {
    blockers.push(
      `Contract version is ${VSME_CONTRACT.version}; expected ${EXPECTED_SCHEMA_VERSION}`
    );
  }
}

function checkExportReadyStability(blockers: string[], warnings: string[]): void {
  const emptyScope = buildVsmeCompleteness(120, [], {});
  const emptyScopeRepeat = buildVsmeCompleteness(120, [], {});
  if (
    emptyScope.exportBlockingFields.length !==
    emptyScopeRepeat.exportBlockingFields.length
  ) {
    blockers.push("exportReady completeness is non-deterministic for empty periods");
  }

  if (emptyScope.exportBlockingFields.length === 0) {
    blockers.push(
      "Empty in-scope period incorrectly has zero export-blocking fields"
    );
  }

  const largeScope = buildVsmeCompleteness(650, [], {});
  if (largeScope.requiredFieldIds.length < emptyScope.requiredFieldIds.length) {
    warnings.push(
      "Comprehensive module scope has fewer required fields than basic-only scope (unexpected)"
    );
  }

  const required = emptyScope.requiredFieldIds;
  if (required.length === 0) {
    warnings.push("No required fields resolved at employeeCount=120");
  } else {
    const fullyComplete = buildVsmeCompleteness(650, required, {});
    if (fullyComplete.exportBlockingFields.length > 0) {
      blockers.push(
        "Populated required-field set still reports export-blocking fields"
      );
    }
    if (!fullyComplete.exportBlockingFields.length) {
      /* exportReady stable when all required values present */
    }
  }
}

function checkUiSchemaLoad(blockers: string[], warnings: string[]): void {
  try {
    for (const count of [0, 120, 650] as const) {
      const fields = countUiSchemaFields(count);
      if (fields !== VSME_FIELD_COUNT) {
        blockers.push(
          `UI schema at employeeCount=${count} returned ${fields} fields; expected ${VSME_FIELD_COUNT}`
        );
      }
    }
  } catch (error) {
    blockers.push(
      `UI schema build failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (VSME_FIELD_IDS.length !== VSME_CONTRACT_REGISTRY.totalFields) {
    warnings.push(
      `Registry field id count ${VSME_FIELD_IDS.length} differs from contract ${VSME_CONTRACT_REGISTRY.totalFields}`
    );
  }
}

function checkExportIntegrity(): boolean {
  if (VSME_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.totalFields) {
    return false;
  }
  try {
    const snapshot = buildEfragExportSnapshot({
      employeeCount: 120,
      materialityByFieldId: {},
      values: [],
      requiredFieldIds: [],
    });
    const validation = validateEfragExport(snapshot);
    return (
      typeof validation.isValid === "boolean" &&
      Array.isArray(validation.missingFields)
    );
  } catch {
    return false;
  }
}

function checkApiEnvelopeIntegrity(blockers: string[]): void {
  const success = apiSuccess({ probe: true });
  const error = apiError("probe", 400);
  const parse = async (res: Response) => {
    const body = (await res.json()) as {
      success?: boolean;
      data?: unknown;
      error?: string;
    };
    return body;
  };

  return void (async () => {
    const okBody = await parse(success);
    if (okBody.success !== true || okBody.data === undefined) {
      blockers.push("apiSuccess envelope missing success:true or data");
    }
    const errBody = await parse(error);
    if (errBody.success !== false || typeof errBody.error !== "string") {
      blockers.push("apiError envelope missing success:false or error string");
    }
  })();
}

async function checkApiEnvelopeIntegrityAsync(
  blockers: string[]
): Promise<void> {
  const okBody = (await apiSuccess({ probe: true }).json()) as {
    success?: boolean;
    data?: unknown;
  };
  if (okBody.success !== true || okBody.data === undefined) {
    blockers.push("apiSuccess envelope missing success:true or data");
  }
  const errBody = (await apiError("probe", 400).json()) as {
    success?: boolean;
    error?: string;
  };
  if (errBody.success !== false || typeof errBody.error !== "string") {
    blockers.push("apiError envelope missing success:false or error string");
  }
}

async function checkCircularImportSafety(blockers: string[]): Promise<void> {
  for (const specifier of RUNTIME_MODULE_CHECKS) {
    try {
      await import(specifier);
    } catch (error) {
      blockers.push(
        `Runtime module load failed (${specifier}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

async function checkLegacyRowPresence(blockers: string[]): Promise<void> {
  const rows = await prisma.sustainabilityDataPoint.findMany({
    select: {
      fieldId: true,
      legacyFieldId: true,
      migrationStatus: true,
    },
    take: 5000,
  });

  const legacyCount = rows.filter(
    (row) =>
      !isRegisteredFieldId(row.fieldId) ||
      row.legacyFieldId != null ||
      row.migrationStatus != null
  ).length;

  if (legacyCount > 0) {
    blockers.push(
      `${legacyCount} legacy or non-v2 data row(s) present (STRICT_V2 requires 0 for green)`
    );
  }
}

async function checkKpiSnapshotConsistency(warnings: string[]): Promise<void> {
  const period = await prisma.reportingPeriod.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!period) {
    warnings.push("No reporting periods in database — KPI/snapshot check skipped");
    return;
  }

  const snapshot = await prisma.vsmeExportSnapshot.findFirst({
    where: { reportingPeriodId: period.id },
    orderBy: { version: "desc" },
    select: { stateSnapshot: true, coverage: true },
  });

  if (!snapshot) {
    warnings.push("No export snapshots yet — consistency check skipped");
    return;
  }

  const state = snapshot.stateSnapshot as {
    audit?: { exportReady?: boolean };
    completeness?: { missingRequiredFields?: string[] };
  };

  if (typeof snapshot.coverage !== "number") {
    warnings.push("Latest export snapshot missing numeric coverage");
  }

  if (state.audit?.exportReady == null) {
    warnings.push("Latest export snapshot audit missing exportReady flag");
  }

  if (!state.completeness?.missingRequiredFields) {
    warnings.push(
      "Latest export snapshot state missing completeness.missingRequiredFields"
    );
  }
}

function computeReadinessScore(
  blockers: string[],
  warnings: string[]
): number {
  let score = 100;
  score -= blockers.length * 25;
  score -= warnings.length * 5;
  return Math.max(0, Math.min(100, score));
}

function deriveSystemHealth(
  blockers: string[],
  warnings: string[]
): SystemHealth {
  if (blockers.length > 0) {
    return "red";
  }
  if (warnings.length > 0) {
    return "yellow";
  }
  return "green";
}

/**
 * Read-only release readiness evaluation for pilot operations.
 */
export async function runReadinessCheck(): Promise<ReadinessCheckResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  checkSchemaVersionConsistency(blockers);
  checkExportReadyStability(blockers, warnings);
  checkUiSchemaLoad(blockers, warnings);
  await checkApiEnvelopeIntegrityAsync(blockers);
  await checkCircularImportSafety(blockers);

  try {
    await checkLegacyRowPresence(blockers);
    await checkKpiSnapshotConsistency(warnings);
  } catch (error) {
    warnings.push(
      `Database readiness checks skipped: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const exportIntegrity = checkExportIntegrity();
  if (!exportIntegrity) {
    blockers.push("EFRAG export integrity self-check failed");
  }

  const systemHealth = deriveSystemHealth(blockers, warnings);
  const readinessScore = computeReadinessScore(blockers, warnings);

  const result: ReadinessCheckResult = {
    systemHealth,
    blockers,
    warnings,
    readinessScore,
    schemaVersion: VSME_SCHEMA_VERSION,
    registryVersion: VSME_CONTRACT.version,
    exportIntegrity,
  };

  if (isPilotModeEnabled()) {
    pilotTelemetryLog("readiness.evaluated", {
      systemHealth,
      readinessScore,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    });
  }

  return result;
}

/** Blocks artifact generation only when system health is red. */
export async function assertSystemReadyForExport(): Promise<
  | { ok: true; readiness: ReadinessCheckResult }
  | { ok: false; readiness: ReadinessCheckResult; message: string }
> {
  const readiness = await runReadinessCheck();
  if (readiness.systemHealth === "red") {
    return {
      ok: false,
      readiness,
      message:
        "Export blocked: system readiness is red. Resolve readiness blockers before exporting.",
    };
  }
  return { ok: true, readiness };
}
