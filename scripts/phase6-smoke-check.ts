/**
 * Phase 6 — controlled release readiness smoke checks.
 * Usage: npx tsx scripts/phase6-smoke-check.ts
 */
import * as XLSX from "xlsx";
import { VSME_FIELD_COUNT } from "../lib/vsme/vsme.fieldRegistry";
import { isV2FieldId } from "../lib/vsme/runtime/dataTruthMode";

const BASE = process.env.LIBREVS_BASE_URL ?? "http://localhost:3000";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function fetchJson<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = (await res.json()) as ApiEnvelope<T>;
  return { status: res.status, body, res };
}

async function main(): Promise<void> {
  console.log("Phase 6 smoke check");
  console.log(`Base: ${BASE}`);

  const home = await fetch(`${BASE}/vsme`);
  if (!home.ok) {
    fail(`/vsme HTTP ${home.status}`);
  }
  ok("/vsme loads");

  const healthRes = await fetchJson<{
    status: string;
    registry: { fieldCount: number };
  }>("/api/system-health");
  if (healthRes.status !== 200 || !healthRes.body.success) {
    fail(`system-health failed: ${healthRes.status}`);
  }
  if (healthRes.body.data?.registry.fieldCount !== VSME_FIELD_COUNT) {
    fail(
      `system-health fieldCount ${healthRes.body.data?.registry.fieldCount} !== ${VSME_FIELD_COUNT}`
    );
  }
  ok(`system-health (${healthRes.body.data?.status})`);

  const schemaRes = await fetchJson<{ sections: unknown[] }>(
    "/api/vsme/ui-schema?employeeCount=120"
  );
  if (schemaRes.status !== 200 || !schemaRes.body.success || !schemaRes.body.data) {
    fail(`ui-schema failed: ${schemaRes.status}`);
  }
  const fieldCount = (
    schemaRes.body.data as { sections: Array<{ subsections: Array<{ fields: unknown[] }> }> }
  ).sections.reduce(
    (n, s) =>
      n + s.subsections.reduce((m, sub) => m + sub.fields.length, 0),
    0
  );
  if (fieldCount !== VSME_FIELD_COUNT) {
    fail(`Expected ${VSME_FIELD_COUNT} fields, got ${fieldCount}`);
  }
  ok(`Schema loads (${VSME_FIELD_COUNT} fields)`);

  const periodsRes = await fetchJson<Array<{ id: string; year: number }>>(
    "/api/reporting-period"
  );
  if (periodsRes.status !== 200 || !periodsRes.body.success) {
    fail("reporting-period list failed");
  }
  const periods = periodsRes.body.data ?? [];
  if (periods.length === 0) {
    fail("No reporting periods — run npm run seed:test");
  }
  ok(`Reporting periods (${periods.length})`);

  const periodId = periods[0]!.id;

  const uiPeriod = await fetchJson<{
    sections: Array<{
      subsections: Array<{ fields: Array<{ fieldId: string }> }>;
    }>;
  }>(`/api/vsme/ui-schema?employeeCount=120&reportingPeriodId=${periodId}`);
  if (uiPeriod.status !== 200 || !uiPeriod.body.success) {
    fail("ui-schema with period failed");
  }
  const ids = uiPeriod.body.data!.sections.flatMap((s) =>
    s.subsections.flatMap((sub) => sub.fields.map((f) => f.fieldId))
  );
  const bad = ids.filter((id) => !isV2FieldId(id));
  if (bad.length > 0) {
    fail(`Legacy fieldIds in UI: ${bad.slice(0, 3).join(", ")}`);
  }
  ok("No legacy fieldIds in UI schema");

  const xlsxBlocked = await fetch(
    `${BASE}/api/reporting-period/${periodId}/export/xlsx`
  );
  if (xlsxBlocked.status === 200) {
    const buf = Buffer.from(await xlsxBlocked.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    if (!wb.SheetNames.includes("General")) {
      fail("XLSX missing General sheet");
    }
    ok("Export XLSX endpoint responds");
  } else if (xlsxBlocked.status === 400) {
    ok("Export XLSX blocked when incomplete (validation gate)");
  } else {
    fail(`Unexpected XLSX status ${xlsxBlocked.status}`);
  }

  const pdfRes = await fetch(
    `${BASE}/api/reporting-period/${periodId}/export/pdf`
  );
  if (pdfRes.status !== 200 && pdfRes.status !== 400) {
    fail(`PDF endpoint unexpected status ${pdfRes.status}`);
  }
  ok(
    pdfRes.status === 200
      ? "Export PDF endpoint responds"
      : "Export PDF blocked when incomplete"
  );

  const validationRes = await fetchJson<{
    validation: { isValid: boolean; exportCoverage: number };
  }>(`/api/reporting-period/${periodId}/export-validation`);
  if (validationRes.status !== 200 || !validationRes.body.success) {
    fail("export-validation failed");
  }
  ok("Export validation endpoint responds");

  const readinessRes = await fetchJson<{
    systemHealth: string;
    readinessScore: number;
    exportIntegrity: boolean;
    blockers?: string[];
  }>("/api/vsme/release/readiness");
  if (readinessRes.status !== 200 || !readinessRes.body.success) {
    fail(`release/readiness failed: ${readinessRes.status}`);
  }
  const health = readinessRes.body.data!.systemHealth;
  if (health === "red") {
    fail(
      `System readiness is red: ${readinessRes.body.data!.blockers?.join("; ") ?? "unknown"}`
    );
  }
  ok(`Release readiness (${health}, score ${readinessRes.body.data!.readinessScore})`);

  const testFieldId = "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH";
  const postRes = await fetchJson("/api/data-point", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportingPeriodId: periodId,
      dataPoints: [{ fieldId: testFieldId, value: "42", unit: "MWh" }],
    }),
  });
  if (postRes.status !== 200 || !postRes.body.success) {
    fail(`POST data-point failed: ${postRes.body.error ?? postRes.status}`);
  }
  ok("POST data-point (v2 fieldId)");

  const feedbackRes = await fetchJson("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportingPeriodId: periodId,
      message: "phase6 smoke test feedback",
    }),
  });
  if (feedbackRes.status !== 201 || !feedbackRes.body.success) {
    fail(`POST feedback failed: ${feedbackRes.status}`);
  }
  ok("POST /api/feedback");

  console.log("\nPhase 6 smoke check passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
