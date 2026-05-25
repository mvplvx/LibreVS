import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import { enrichExportRows, type EnrichedVsmeExportRow } from "./enrichExportRows";
import { computeRegistryHash } from "@/lib/vsme/registryHash";
import {
  DEFAULT_REPORTING_CURRENCY,
  parseReportingCurrency,
  type EuReportingCurrency,
} from "@/lib/vsme/currency";

export type CanonicalExportRow = {
  fieldId: string;
  path: string;
  label: string;
  value: string;
  unit: string | null;
  excelCell: string;
  xbrlNamedRange: string;
  sectionCode: string;
  module: "B" | "C";
};

export type ExportDatasetMetadata = {
  schemaVersion: string;
  exportedAt: string;
  registryHash: string;
  rowCount: number;
  reportingCurrency: EuReportingCurrency;
};

export type CanonicalExportDataset = {
  metadata: ExportDatasetMetadata;
  rows: CanonicalExportRow[];
};

function toCanonicalRow(row: EnrichedVsmeExportRow): CanonicalExportRow {
  return {
    fieldId: row.fieldId,
    path: row.path,
    label: row.label,
    value: row.value,
    unit: row.unit,
    excelCell: row.excelCell,
    xbrlNamedRange: row.xbrlNamedRange,
    sectionCode: row.sectionCode,
    module: row.module,
  };
}

/** Single canonical ordering for JSON, XLSX, and PDF export paths. */
export function buildCanonicalExportDataset(
  rows: VsmeExportRow[],
  schemaVersion: string,
  exportedAt: string = new Date().toISOString(),
  reportingCurrency: string | null | undefined = DEFAULT_REPORTING_CURRENCY
): CanonicalExportDataset {
  const enriched = enrichExportRows(rows);
  const canonical = enriched
    .map(toCanonicalRow)
    .sort((a, b) => a.fieldId.localeCompare(b.fieldId));

  return {
    metadata: {
      schemaVersion,
      exportedAt,
      registryHash: computeRegistryHash(),
      rowCount: canonical.length,
      reportingCurrency: parseReportingCurrency(reportingCurrency),
    },
    rows: canonical,
  };
}

export function serializeExportDatasetJson(dataset: CanonicalExportDataset): string {
  return JSON.stringify(dataset, null, 2);
}
