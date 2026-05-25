import * as XLSX from "xlsx";
import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import {
  buildCanonicalExportDataset,
  type CanonicalExportDataset,
} from "./exportDataset";
import {
  writeVsmeWorkbook,
  writeVsmeWorkbookBuffer,
  type VsmeExportInput,
} from "./xlsx/writeVsmeWorkbook";
import { createExportManifest } from "./exportManifest";

export type { VsmeExportInput };

function rowsFromDataset(dataset: CanonicalExportDataset): VsmeExportRow[] {
  return dataset.rows.map((row) => ({
    fieldId: row.fieldId,
    path: row.path,
    excelCell: row.excelCell,
    xbrlNamedRange: row.xbrlNamedRange,
    value: row.value,
    unit: row.unit,
    sectionCode: row.sectionCode,
    module: row.module,
  }));
}

function manifestFromDataset(
  input: VsmeExportInput,
  dataset: CanonicalExportDataset
) {
  return createExportManifest({
    reportingPeriodId: input.reportingPeriodId,
    schemaVersion: dataset.metadata.schemaVersion,
    exportedFieldCount: dataset.metadata.rowCount,
    exportedAt: dataset.metadata.exportedAt,
    format: "xlsx",
    registryHash: dataset.metadata.registryHash,
  });
}

/** Audit-grade XLSX — canonical dataset identical to JSON export serialization. */
export function exportVsmeToXlsx(input: VsmeExportInput) {
  const dataset = buildCanonicalExportDataset(
    input.rows,
    input.schemaVersion,
    undefined,
    input.reportingCurrency
  );
  return writeVsmeWorkbook(
    { ...input, rows: rowsFromDataset(dataset) },
    manifestFromDataset(input, dataset)
  );
}

export function exportVsmeToXlsxBuffer(input: VsmeExportInput): Buffer {
  const dataset = buildCanonicalExportDataset(
    input.rows,
    input.schemaVersion,
    undefined,
    input.reportingCurrency
  );
  const wb = writeVsmeWorkbook(
    { ...input, rows: rowsFromDataset(dataset) },
    manifestFromDataset(input, dataset)
  );
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** @deprecated Prefer exportVsmeToXlsxBuffer */
export { writeVsmeWorkbookBuffer };
