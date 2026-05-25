import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import { buildCanonicalExportDataset } from "./exportDataset";
import { createExportManifest } from "./exportManifest";
import { writeVsmePdf, type VsmePdfInput } from "./pdf/writeVsmePdf";

export type { VsmePdfInput };

/** Human-readable PDF compliance summary from the canonical export dataset. */
export async function exportVsmeToPdf(input: VsmePdfInput): Promise<Uint8Array> {
  const dataset = buildCanonicalExportDataset(
    input.rows,
    input.schemaVersion,
    input.exportedAt,
    input.reportingCurrency
  );
  const manifest = createExportManifest({
    reportingPeriodId: input.reportingPeriodId,
    schemaVersion: dataset.metadata.schemaVersion,
    exportedFieldCount: dataset.metadata.rowCount,
    exportedAt: dataset.metadata.exportedAt,
    format: "pdf",
    registryHash: dataset.metadata.registryHash,
  });

  const rows: VsmeExportRow[] = dataset.rows.map((row) => ({
    fieldId: row.fieldId,
    path: row.path,
    excelCell: row.excelCell,
    xbrlNamedRange: row.xbrlNamedRange,
    value: row.value,
    unit: row.unit,
    sectionCode: row.sectionCode,
    module: row.module,
  }));

  return writeVsmePdf({ ...input, rows }, manifest);
}

export { writeVsmePdf };
