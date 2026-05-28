import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { VsmeExportRow } from "@/lib/vsme/exportMapping";
import { VSME_SCHEMA } from "@/lib/vsme/vsme.schema";
import { enrichExportRows } from "../enrichExportRows";
import {
  createExportManifest,
  serializeExportManifest,
  type ExportManifest,
} from "../exportManifest";

export type VsmePdfInput = {
  companyName: string;
  reportingPeriodId: string;
  year: number;
  schemaVersion: string;
  exportedAt: string;
  rows: VsmeExportRow[];
  exportReady: boolean;
  mandatoryCoveragePercentage: number;
  missingRequiredCount: number;
  reportingCurrency?: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const LINE_HEIGHT = 14;

function sectionTitle(code: string): string {
  const section = VSME_SCHEMA.sections.find((s) => s.code === code);
  return section ? `${code} — ${section.title}` : code;
}

/**
 * Human-readable VSME export summary (serialization only, not a marketing report).
 */
export async function writeVsmePdf(
  input: VsmePdfInput,
  manifest?: ExportManifest
): Promise<Uint8Array> {
  const enriched = enrichExportRows(input.rows);
  const exportManifest =
    manifest ??
    createExportManifest({
      reportingPeriodId: input.reportingPeriodId,
      schemaVersion: input.schemaVersion,
      exportedFieldCount: enriched.length,
      format: "pdf",
      exportedAt: input.exportedAt,
    });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`LibreVS VSME ${input.year}`);
  pdf.setSubject(serializeExportManifest(exportManifest));
  pdf.setKeywords([
    "LibreVS",
    "VSME",
    input.schemaVersion,
    exportManifest.exportId,
  ]);
  pdf.setCreator("LibreVS");
  pdf.setProducer("LibreVS Phase 5 PDF Export");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawLine = (text: string, bold = false, size = 10) => {
    const usedFont = bold ? fontBold : font;
    if (y < MARGIN + LINE_HEIGHT) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: usedFont,
      color: rgb(0.07, 0.09, 0.13),
    });
    y -= LINE_HEIGHT + (bold ? 4 : 2);
  };

  drawLine("LibreVS VSME Export Summary", true, 14);
  drawLine(`Company: ${input.companyName}`, true);
  drawLine(`Reporting year: ${input.year}`);
  drawLine(`Schema version: ${input.schemaVersion}`);
  drawLine(`Exported at: ${input.exportedAt}`);
  drawLine(`Registry hash: ${exportManifest.registryHash}`);
  drawLine(`Export ID: ${exportManifest.exportId}`);
  y -= 6;

  drawLine("Validation summary", true, 11);
  drawLine(`Export ready: ${input.exportReady ? "yes" : "no"}`);
  drawLine(
    `Mandatory coverage: ${input.mandatoryCoveragePercentage.toFixed(1)}%`
  );
  drawLine(`Missing required fields: ${input.missingRequiredCount}`);
  drawLine(`Serialized material fields: ${enriched.length}`);
  y -= 8;

  const bySection = new Map<string, typeof enriched>();
  for (const row of enriched) {
    const list = bySection.get(row.sectionCode) ?? [];
    list.push(row);
    bySection.set(row.sectionCode, list);
  }

  const sectionCodes = [...bySection.keys()].sort();

  for (const code of sectionCodes) {
    const sectionRows = bySection.get(code)!;
    drawLine(sectionTitle(code), true, 11);
    for (const row of sectionRows) {
      const unitSuffix = row.unit ? ` ${row.unit}` : "";
      drawLine(`• ${row.label}: ${row.value}${unitSuffix}`);
      drawLine(`  ${row.fieldId} · ${row.path}`);
    }
    y -= 4;
  }

  return pdf.save();
}
