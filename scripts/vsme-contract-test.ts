/**
 * Phase 4F — VSME contract freeze verification (read-only against local dev server).
 * Usage: npx tsx scripts/vsme-contract-test.ts
 * Env: LIBREVS_BASE_URL (default http://localhost:3000)
 */
import { VSME_CONTRACT_REGISTRY } from "../lib/vsme/CONTRACT";
import { VSME_SCHEMA_VERSION } from "../lib/vsme/schemaVersion";
import {
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  VSME_FIELD_COUNT,
} from "../lib/vsme/vsme.fieldRegistry";
import { buildVsmePeriodSnapshot } from "../lib/vsme/periodSnapshot";
import { loadPeriodIntelligence } from "../lib/api/loadPeriodIntelligence";
import {
  mergeResults,
  validateActiveFieldIds,
  validateExportPayload,
  validateKpiPayload,
  validateRegistryContract,
  validateRequiredToFillConsistency,
  validateSnapshotPipelineContract,
  validateSnapshotVsUiSchema,
  validateUiSchemaPayload,
  type SemanticValidationResult,
} from "../lib/vsme/dev/semanticValidator";

const BASE = process.env.LIBREVS_BASE_URL ?? "http://localhost:3000";
const ORG = process.env.LIBREVS_ORG_ID ?? "librevs-demo-org";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

async function fetchJson<T>(path: string): Promise<{ status: number; body: ApiEnvelope<T> }> {
  const res = await fetch(`${BASE}${path}`);
  const body = (await res.json()) as ApiEnvelope<T>;
  return { status: res.status, body };
}

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

function report(result: SemanticValidationResult, label: string): void {
  for (const w of result.warnings) {
    console.warn(`  ⚠ ${label}: ${w}`);
  }
  for (const e of result.errors) {
    console.error(`  ✗ ${label}: ${e}`);
  }
}

function assertOk(result: SemanticValidationResult, label: string): void {
  report(result, label);
  if (!result.ok) {
    fail(`${label} failed (${result.errors.length} error(s))`);
  }
  console.log(`  ✓ ${label}`);
}

async function main(): Promise<void> {
  console.log("VSME Contract Test (Phase 4F)");
  console.log(`Base URL: ${BASE}`);

  section("Registry");
  assertOk(validateRegistryContract(), "registry");
  if (VSME_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.totalFields) {
    fail(`field count ${VSME_FIELD_COUNT}`);
  }
  if (VSME_B_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.bModuleFields) {
    fail(`B count ${VSME_B_FIELD_COUNT}`);
  }
  if (VSME_C_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.cModuleFields) {
    fail(`C count ${VSME_C_FIELD_COUNT}`);
  }
  console.log(`  ✓ 264 fields (B=${VSME_B_FIELD_COUNT}, C=${VSME_C_FIELD_COUNT})`);

  section("Semantic rules (offline)");
  assertOk(validateRequiredToFillConsistency(0), "requiredToFill @ 0 employees");
  assertOk(validateRequiredToFillConsistency(600), "requiredToFill @ 600 employees");
  assertOk(validateSnapshotPipelineContract(), "snapshot pipeline");

  section("API envelopes");
  const periodRes = await fetchJson<unknown[]>("/api/reporting-period");
  if (periodRes.status >= 500 || !periodRes.body.success || !periodRes.body.data) {
    fail(`GET /api/reporting-period — HTTP ${periodRes.status} ${periodRes.body.error ?? ""}`);
  }
  const periods = periodRes.body.data as Array<{
    id: string;
    companyId: string;
    year: number;
    schemaVersion?: string;
  }>;
  if (periods.length === 0) {
    fail("no reporting periods — seed DB before contract test");
  }
  const periodId = periods[0].id;
  console.log(`  ✓ reporting-period (${periods.length} periods, using ${periodId})`);

  for (const [label, path] of [
    ["company", "/api/company"],
    ["ui-schema-0", "/api/vsme/ui-schema?employeeCount=0"],
    ["ui-schema-600", "/api/vsme/ui-schema?employeeCount=600"],
  ] as const) {
    const { status, body } = await fetchJson<Record<string, unknown>>(path);
    if (status >= 500 || !body.success || body.data == null) {
      fail(`${label}: HTTP ${status} ${body.error ?? "no data"}`);
    }
    if (label.startsWith("ui-schema")) {
      assertOk(
        validateUiSchemaPayload(body.data, path),
        label
      );
    }
    console.log(`  ✓ ${label}`);
  }

  const uiPeriod = await fetchJson<Record<string, unknown>>(
    `/api/vsme/ui-schema?employeeCount=0&reportingPeriodId=${periodId}`
  );
  if (uiPeriod.status >= 500 || !uiPeriod.body.success) {
    fail(`ui-schema+period: ${uiPeriod.body.error}`);
  }
  assertOk(
    validateUiSchemaPayload(uiPeriod.body.data!, "/api/vsme/ui-schema?…&reportingPeriodId"),
    "ui-schema+period"
  );

  section("Period metrics (snapshot-derived)");
  const kpiRes = await fetchJson<Record<string, unknown>>(
    `/api/reporting-period/${periodId}/kpis`
  );
  const covRes = await fetchJson<Record<string, unknown>>(
    `/api/reporting-period/${periodId}/vsme-coverage`
  );
  const expRes = await fetchJson<Record<string, unknown>>(
    `/api/reporting-period/${periodId}/export`
  );

  for (const [name, res] of [
    ["kpis", kpiRes],
    ["vsme-coverage", covRes],
    ["export", expRes],
  ] as const) {
    if (res.status >= 500 || !res.body.success || res.body.data == null) {
      fail(`${name}: HTTP ${res.status} ${res.body.error ?? ""}`);
    }
  }

  const kpi = kpiRes.body.data!;
  const cov = covRes.body.data!;
  const exp = expRes.body.data!;

  assertOk(validateKpiPayload(kpi, "/kpis"), "kpis contract");
  assertOk(validateKpiPayload(cov, "/vsme-coverage"), "vsme-coverage contract");
  assertOk(validateExportPayload(exp, "/export"), "export contract");

  if (kpi.schemaVersion !== VSME_SCHEMA_VERSION) {
    fail(`kpis schemaVersion ${kpi.schemaVersion}`);
  }

  const kpiMandatory = kpi.mandatoryCoveragePercentage;
  const covMandatory = cov.mandatoryCoveragePercentage;
  if (kpiMandatory !== covMandatory) {
    fail(`mandatoryCoverage mismatch kpis=${kpiMandatory} coverage=${covMandatory}`);
  }
  if (kpi.exportReady !== cov.exportReady || kpi.exportReady !== exp.exportReady) {
    fail("exportReady mismatch across kpis / vsme-coverage / export");
  }

  const blocking = (kpi.completeness as { exportBlockingFields?: string[] })
    ?.exportBlockingFields;
  const validationMissing = (exp.validation as { missingFieldIds?: string[] })
    ?.missingFieldIds;
  if (
    blocking &&
    validationMissing &&
    JSON.stringify([...blocking].sort()) !==
      JSON.stringify([...validationMissing].sort())
  ) {
    fail("exportBlockingFields !== validation.missingFieldIds");
  }
  console.log("  ✓ cross-endpoint metrics aligned");

  section("Data-point GET (STRICT_V2)");
  const dpRes = await fetchJson<Array<{ fieldId: string }>>(
    `/api/data-point?reportingPeriodId=${periodId}`
  );
  if (dpRes.status >= 500 || !dpRes.body.success) {
    fail(`data-point GET: ${dpRes.body.error}`);
  }
  const fieldIds = (dpRes.body.data ?? []).map((r) => r.fieldId);
  assertOk(
    validateActiveFieldIds(fieldIds, "GET /api/data-point"),
    "active fieldIds"
  );
  console.log(`  ✓ data-point (${fieldIds.length} v2 rows)`);

  section("Export v2-only rows");
  const rows = (exp.rows as Array<{ fieldId: string }>) ?? [];
  assertOk(
    validateActiveFieldIds(
      rows.map((r) => r.fieldId),
      "export rows"
    ),
    "export row fieldIds"
  );

  section("Snapshot vs UI schema (offline, same period)");
  const intel = await loadPeriodIntelligence(periodId, ORG);
  if (!intel) {
    console.warn("  ⚠ skip snapshot alignment — period not found for org (use seeded DB)");
  } else {
    const snapshot = intel.vsme;
    assertOk(
      validateSnapshotVsUiSchema(
        snapshot,
        intel.employeeCount,
        intel.materialityByFieldId
      ),
      "snapshot vs ui-schema required sets"
    );
    const rebuilt = buildVsmePeriodSnapshot(
      snapshot.values.map((v) => ({
        fieldId: v.fieldId,
        value: v.value,
        unit: v.unit,
      })),
      intel.employeeCount,
      intel.materialityByFieldId
    );
    if (rebuilt.exportReady !== snapshot.exportReady) {
      fail("buildVsmePeriodSnapshot exportReady not deterministic");
    }
    console.log("  ✓ snapshot builder deterministic");
  }

  console.log("\n✔ All VSME contract checks passed.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
