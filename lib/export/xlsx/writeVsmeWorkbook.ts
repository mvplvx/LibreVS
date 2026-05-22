import * as XLSX from "xlsx";
import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import {
  enrichExportRows,
  groupRowsByExcelSheet,
  SHEET_ORDER,
  type EnrichedVsmeExportRow,
} from "../enrichExportRows";
import {
  createExportManifest,
  serializeExportManifest,
  type ExportManifest,
} from "../exportManifest";

export type VsmeExportInput = {
  reportingPeriodId: string;
  rows: VsmeExportRow[];
  schemaVersion: string;
};

const HEADER = [
  "fieldId",
  "label",
  "value",
  "unit",
  "excelCell",
  "xbrlNamedRange",
] as const;

function sheetDataFromRows(rows: EnrichedVsmeExportRow[]): string[][] {
  const data: string[][] = [HEADER.slice()];
  for (const row of rows) {
    data.push([
      row.fieldId,
      row.label,
      row.value,
      row.unit ?? "",
      row.excelCell,
      row.xbrlNamedRange,
    ]);
  }
  return data;
}

/**
 * Deterministic XLSX serialization of validated export rows (no formulas or inference).
 */
export function writeVsmeWorkbook(
  input: VsmeExportInput,
  manifest?: ExportManifest
): XLSX.WorkBook {
  const enriched = enrichExportRows(input.rows);
  const bySheet = groupRowsByExcelSheet(enriched);

  const exportManifest =
    manifest ??
    createExportManifest({
      reportingPeriodId: input.reportingPeriodId,
      schemaVersion: input.schemaVersion,
      exportedFieldCount: enriched.length,
      format: "xlsx",
    });

  const wb = XLSX.utils.book_new();

  for (const sheetName of SHEET_ORDER) {
    const rows = bySheet[sheetName];
    const ws = XLSX.utils.aoa_to_sheet(sheetDataFromRows(rows));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const manifestJson = serializeExportManifest(exportManifest);
  wb.Props = {
    Title: "LibreVS VSME Export",
    Subject: `VSME ${input.schemaVersion} · ${exportManifest.registryHash.slice(0, 12)}`,
    Author: "LibreVS",
    Comments: manifestJson,
  };

  return wb;
}

export function writeVsmeWorkbookBuffer(input: VsmeExportInput): Buffer {
  const wb = writeVsmeWorkbook(input);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
