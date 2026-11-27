import ExcelJS from "exceljs";

import type { VerifiedReportSnapshot } from "./reportSeal";
import {
  projectPublicReport,
  REPORT_LIMITATIONS_NOTE,
  type PublicFact,
  type PublicReport,
} from "./reportPublication";

const HEADER_FILL = "FFF1F5F9";
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export async function renderVS2026Xlsx(snapshot: VerifiedReportSnapshot): Promise<Uint8Array> {
  const report = projectPublicReport(snapshot.dataset);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LibreVS";
  workbook.lastModifiedBy = "LibreVS";
  workbook.created = new Date(snapshot.finalisedAt);
  workbook.modified = new Date(snapshot.finalisedAt);
  workbook.title = reportTitle(snapshot);
  workbook.subject = "VS 2026 Option A — Basic Module";
  workbook.description = REPORT_LIMITATIONS_NOTE;
  writeInfo(workbook, snapshot);
  for (const disclosure of snapshot.dataset.disclosures) {
    writeDisclosure(
      workbook,
      disclosure.id,
      disclosure.title,
      report.facts.filter((fact) => fact.disclosureId === disclosure.id),
    );
  }
  writeSupplementary(workbook, report);
  writeOmissions(workbook, report);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function writeInfo(workbook: ExcelJS.Workbook, snapshot: VerifiedReportSnapshot): void {
  const sheet = workbook.addWorksheet("Report Info", { views: [{ state: "frozen", ySplit: 1 }] });
  const rows: [string, string][] = [
    ["Field", "Value"],
    ["Undertaking", snapshot.dataset.undertaking.name],
    ["Reporting period", snapshot.dataset.metadata.year === null ? "Not stated" : String(snapshot.dataset.metadata.year)],
    ["Reporting option", "Option A — Basic Module"],
    ["Regulatory version", snapshot.regulatoryVersion],
    ["Regulatory instrument", snapshot.dataset.metadata.regulatoryInstrument],
    ["Revision", String(snapshot.revision)],
    ["Finalised at", snapshot.finalisedAt],
    ["Reporting currency", snapshot.dataset.metadata.currency],
    ["Conformity declaration", snapshot.conformityStatement],
    ["Limitations", REPORT_LIMITATIONS_NOTE],
    ["Format", "LibreVS VS 2026 report. This is not an EFRAG digital template."],
  ];
  addRows(sheet, rows, [28, 88]);
}

function writeDisclosure(workbook: ExcelJS.Workbook, id: string, title: string, facts: readonly PublicFact[]): void {
  const sheet = workbook.addWorksheet(id, { views: [{ state: "frozen", ySplit: 2 }] });
  const titleRow = sheet.addRow([textCell(title)]);
  titleRow.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  const header = sheet.addRow(["Datapoint ID", "Label", "Paragraph", "Value", "Unit", "Dimension", "Entry", "Role"]);
  styleHeader(header);
  for (const fact of facts) {
    const row = sheet.addRow([
      textCell(fact.datapointId),
      textCell(fact.label),
      textCell(fact.paragraph),
      valueCell(fact.rawValue, fact.displayValue),
      fact.unit === null ? "" : textCell(fact.unit),
      fact.dimensionMember === null ? "" : textCell(fact.dimensionMember),
      fact.entryLabel === null ? "" : textCell(fact.entryLabel),
      fact.role,
    ]);
    wrap(row);
  }
  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: Math.max(sheet.rowCount, 2), column: 8 },
  };
  sheet.getColumn(1).width = 42;
  sheet.getColumn(2).width = 56;
  sheet.getColumn(4).width = 42;
}

function writeSupplementary(workbook: ExcelJS.Workbook, report: PublicReport): void {
  const sheet = workbook.addWorksheet("Supplementary", { views: [{ state: "frozen", ySplit: 1 }] });
  const header = sheet.addRow(["Entry", "Datapoint ID", "Label", "Value", "Unit", "Dimension", "Limitation"]);
  styleHeader(header);
  for (const item of report.supplementary) {
    for (const cell of item.cells) {
      const row = sheet.addRow([
        textCell(item.entryLabel),
        textCell(cell.datapointId),
        textCell(cell.label),
        valueCell(cell.rawValue, cell.displayValue),
        cell.unit === null ? "" : textCell(cell.unit),
        textCell(cell.dimensionMember),
        textCell(item.limitation),
      ]);
      wrap(row);
    }
  }
  if (report.supplementary.length === 0) {
    sheet.addRow([textCell("None"), "", "", "", "", "", textCell("No supplementary information is included in this revision.")]);
  }
  applyFilter(sheet, 7);
  sheet.getColumn(3).width = 42;
  sheet.getColumn(7).width = 72;
}

function writeOmissions(workbook: ExcelJS.Workbook, report: PublicReport): void {
  const sheet = workbook.addWorksheet("Omissions", { views: [{ state: "frozen", ySplit: 1 }] });
  const header = sheet.addRow(["Datapoint ID", "Label", "Paragraph", "Paragraph 22 reason", "Attestation"]);
  styleHeader(header);
  for (const item of report.omissions) {
    const row = sheet.addRow([
      textCell(item.datapointId),
      textCell(item.label),
      textCell(item.paragraph),
      textCell(item.reason),
      textCell("Undertaking attestation. Not an independent legal approval."),
    ]);
    wrap(row);
  }
  if (report.omissions.length === 0) {
    sheet.addRow(["", textCell("No paragraph 22 omission is included in this revision."), "", "", ""]);
  }
  applyFilter(sheet, 5);
  sheet.getColumn(2).width = 56;
}

function addRows(sheet: ExcelJS.Worksheet, rows: readonly (readonly string[])[], widths: number[]): void {
  rows.forEach((values, index) => {
    const row = sheet.addRow(values.map((value) => textCell(value)));
    if (index === 0) {
      styleHeader(row);
    }
    wrap(row);
  });
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  applyFilter(sheet, widths.length);
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: "top", wrapText: true };
}

function wrap(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "top", wrapText: true };
  });
}

function applyFilter(sheet: ExcelJS.Worksheet, columns: number): void {
  const last = sheet.rowCount;
  if (last < 1) {
    return;
  }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: last, column: columns },
  };
}

function textCell(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function valueCell(raw: string, display: string): string | number {
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && String(numeric) === raw) {
      return numeric;
    }
  }
  return textCell(display);
}

function reportTitle(snapshot: VerifiedReportSnapshot): string {
  const year = snapshot.dataset.metadata.year === null ? "the reporting period" : String(snapshot.dataset.metadata.year);
  return `${snapshot.dataset.undertaking.name} sustainability report ${year}`;
}
