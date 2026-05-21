import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import { VSME_FIELD_REGISTRY } from "@/lib/vsme/vsme.fieldRegistry";
import type { VsmeExcelSheet } from "@/lib/vsme/vsme.types";

export type EnrichedVsmeExportRow = VsmeExportRow & {
  label: string;
  excelSheet: VsmeExcelSheet;
};

const SHEET_ORDER: VsmeExcelSheet[] = [
  "General",
  "Environmental",
  "Social",
  "Governance",
];

export function enrichExportRows(rows: VsmeExportRow[]): EnrichedVsmeExportRow[] {
  return rows.map((row) => {
    const entry = VSME_FIELD_REGISTRY[row.fieldId];
    if (!entry) {
      throw new Error(`Export row references unknown registry fieldId: ${row.fieldId}`);
    }
    return {
      ...row,
      label: entry.label,
      excelSheet: entry.excelSheet,
    };
  });
}

export function groupRowsByExcelSheet(
  rows: EnrichedVsmeExportRow[]
): Record<VsmeExcelSheet, EnrichedVsmeExportRow[]> {
  const groups: Record<VsmeExcelSheet, EnrichedVsmeExportRow[]> = {
    General: [],
    Environmental: [],
    Social: [],
    Governance: [],
  };

  for (const row of rows) {
    groups[row.excelSheet].push(row);
  }

  for (const sheet of SHEET_ORDER) {
    groups[sheet].sort((a, b) => a.fieldId.localeCompare(b.fieldId));
  }

  return groups;
}

export { SHEET_ORDER };
