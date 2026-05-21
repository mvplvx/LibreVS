/**
 * Phase 5 — export artifact regression (local dev server).
 * Usage: npx tsx scripts/export-regression-test.ts
 */
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import { parseExportManifest } from "../lib/export/exportManifest";
import { SHEET_ORDER } from "../lib/export/enrichExportRows";
import { isV2FieldId } from "../lib/vsme/runtime/dataTruthMode";
import { VSME_FIELD_REGISTRY } from "../lib/vsme/vsme.fieldRegistry";

const BASE = process.env.LIBREVS_BASE_URL ?? "http://localhost:3000";
const ORG = process.env.LIBREVS_ORG_ID ?? "librevs-demo-org";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function fetchJson<T>(path: string): Promise<{ status: number; body: ApiEnvelope<T> }> {
  const res = await fetch(`${BASE}${path}`);
  const body = (await res.json()) as ApiEnvelope<T>;
  return { status: res.status, body };
}

async function main(): Promise<void> {
  console.log("Export regression test (Phase 5)");
  console.log(`Base URL: ${BASE}`);

  const periodsRes = await fetchJson<Array<{ id: string; year: number }>>(
    "/api/reporting-period"
  );
  if (periodsRes.status !== 200 || !periodsRes.body.success || !periodsRes.body.data?.length) {
    fail("No reporting periods — seed database and start dev server");
  }

  const periodId = periodsRes.body.data![0]!.id;
  const year = periodsRes.body.data![0]!.year;
  console.log(`Period: ${periodId} (${year})`);

  const dashRes = await fetchJson<{
    exportReady: boolean;
    mandatoryCoveragePercentage?: number;
    requiredCoveragePercentage?: number;
    completeness: { exportBlockingFields: string[]; missingRequiredFields: string[] };
    rows?: unknown;
  }>(`/api/reporting-period/${periodId}/dashboard`);

  if (dashRes.status !== 200 || !dashRes.body.success || !dashRes.body.data) {
    fail(`Dashboard load failed: ${dashRes.status}`);
  }

  const dash = dashRes.body.data;
  const exportReady = dash.exportReady;

  const jsonExportRes = await fetch(`${BASE}/api/reporting-period/${periodId}/export`);
  const jsonExportBody = (await jsonExportRes.json()) as ApiEnvelope<{
    rows: Array<{ fieldId: string }>;
  }>;

  let expectedRowCount = 0;
  if (jsonExportRes.status === 200 && jsonExportBody.success && jsonExportBody.data?.rows) {
    expectedRowCount = jsonExportBody.data.rows.length;
  }

  const xlsxRes = await fetch(
    `${BASE}/api/reporting-period/${periodId}/export/xlsx`
  );

  if (!exportReady) {
    if (xlsxRes.status !== 400) {
      fail(`Expected XLSX 400 when exportReady=false, got ${xlsxRes.status}`);
    }
    const errBody = (await xlsxRes.json()) as ApiEnvelope<unknown>;
    if (!errBody.success && errBody.error === "Export validation failed") {
      ok("XLSX blocked when exportReady=false");
    } else {
      fail(`Unexpected XLSX error body: ${JSON.stringify(errBody)}`);
    }

    const pdfRes = await fetch(
      `${BASE}/api/reporting-period/${periodId}/export/pdf`
    );
    if (pdfRes.status !== 400) {
      fail(`Expected PDF 400 when exportReady=false, got ${pdfRes.status}`);
    }
    ok("PDF blocked when exportReady=false");
    console.log("\nExport regression passed (validation gate only — period not export-ready).");
    return;
  }

  if (xlsxRes.status !== 200) {
    fail(`XLSX export failed: HTTP ${xlsxRes.status}`);
  }

  const xlsxBuf = Buffer.from(await xlsxRes.arrayBuffer());
  if (xlsxBuf.length < 100) {
    fail("XLSX buffer too small");
  }
  ok("XLSX workbook generated");

  const wb = XLSX.read(xlsxBuf, { type: "buffer" });
  for (const sheet of SHEET_ORDER) {
    if (!wb.SheetNames.includes(sheet)) {
      fail(`Missing sheet: ${sheet}`);
    }
  }
  ok("Sheet assignment (General, Environmental, Social, Governance)");

  let serializedRows = 0;
  const seenFieldIds = new Set<string>();

  for (const sheetName of SHEET_ORDER) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    }) as string[][];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) {
        continue;
      }
      const fieldId = String(row[0]);
      if (!isV2FieldId(fieldId)) {
        fail(`Non-v2 fieldId in XLSX: ${fieldId}`);
      }
      if (seenFieldIds.has(fieldId)) {
        fail(`Duplicate fieldId in workbook: ${fieldId}`);
      }
      seenFieldIds.add(fieldId);
      serializedRows += 1;
    }
  }
  ok(`All rows serialized (${serializedRows} fieldIds, v2 only)`);

  if (expectedRowCount > 0 && serializedRows !== expectedRowCount) {
    fail(
      `Row count mismatch: JSON export ${expectedRowCount} vs XLSX ${serializedRows}`
    );
  }

  const manifestRaw = wb.Props?.Comments;
  if (typeof manifestRaw !== "string") {
    fail("XLSX manifest not embedded in workbook Props.Comments");
  }
  const manifest = parseExportManifest(manifestRaw);
  if (!manifest || manifest.format !== "xlsx") {
    fail("Invalid XLSX export manifest");
  }
  ok("XLSX manifest embedded");

  const pdfRes = await fetch(
    `${BASE}/api/reporting-period/${periodId}/export/pdf`
  );
  if (pdfRes.status !== 200) {
    fail(`PDF export failed: HTTP ${pdfRes.status}`);
  }

  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  if (pdfBuf.subarray(0, 4).toString() !== "%PDF") {
    fail("PDF magic bytes invalid");
  }
  ok("PDF generated successfully");

  const pdfDoc = await PDFDocument.load(pdfBuf);
  const subject = pdfDoc.getSubject();
  const pdfManifest = subject ? parseExportManifest(subject) : null;
  if (!pdfManifest || pdfManifest.format !== "pdf") {
    fail("PDF manifest not embedded in document subject");
  }
  ok("PDF manifest embedded");

  if (pdfManifest.exportedFieldCount !== serializedRows) {
    fail(
      `Manifest field count mismatch: ${pdfManifest.exportedFieldCount} vs ${serializedRows}`
    );
  }

  const sectionCodes = new Set<string>();
  if (jsonExportBody.data?.rows) {
    for (const row of jsonExportBody.data.rows as Array<{ fieldId: string }>) {
      const entry = VSME_FIELD_REGISTRY[row.fieldId];
      if (entry) {
        sectionCodes.add(entry.sectionCode);
      }
    }
  }
  if (sectionCodes.size > 0) {
    ok(`Snapshot sections represented: ${sectionCodes.size} section codes`);
  }

  const disposition = pdfRes.headers.get("content-disposition") ?? "";
  if (!disposition.includes(`librevs-vsme-${year}.pdf`)) {
    fail(`PDF filename not librevs-vsme-${year}.pdf`);
  }
  ok("PDF download filename");

  console.log("\nExport regression passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
