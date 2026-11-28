import { readFileSync } from "node:fs";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { VerifiedReportSnapshot } from "./reportSeal";
import {
  projectPublicReport,
  REPORT_LIMITATIONS_NOTE,
  type PublicFact,
} from "./reportPublication";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const BOTTOM = 56;
const INK = rgb(0.09, 0.11, 0.15);
const MUTED = rgb(0.33, 0.37, 0.42);
const RULE = rgb(0.8, 0.83, 0.86);
const BAND = rgb(0.94, 0.95, 0.96);

function bundledFont(fileName: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(process.cwd(), "assets", "fonts", fileName)));
}

export async function renderVS2026Pdf(snapshot: VerifiedReportSnapshot): Promise<Uint8Array> {
  const report = projectPublicReport(snapshot.dataset);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(bundledFont("NotoSans-Regular.ttf"), { subset: true });
  const bold = await pdf.embedFont(bundledFont("NotoSans-Bold.ttf"), { subset: true });
  const year = snapshot.dataset.metadata.year === null ? "the reporting period" : String(snapshot.dataset.metadata.year);
  const title = `${snapshot.dataset.undertaking.name} sustainability report ${year}`;
  pdf.setTitle(title);
  pdf.setAuthor(snapshot.dataset.undertaking.name);
  pdf.setCreator("LibreVS");
  pdf.setProducer("LibreVS");
  pdf.setSubject(`VS 2026 Option A — Basic Module. ${snapshot.regulatoryVersion}. Revision ${snapshot.revision}.`);
  pdf.setKeywords(["LibreVS", "VS 2026", "Option A", snapshot.regulatoryVersion]);
  const layout = new Layout(pdf, regular, bold);
  layout.cover(snapshot, title, year);
  layout.heading("Basis of preparation");
  layout.paragraph(snapshot.conformityStatement);
  layout.paragraph(REPORT_LIMITATIONS_NOTE);
  layout.paragraph(
    `Reporting currency: ${snapshot.dataset.metadata.currency}. Amounts stay in that currency. No conversion rate is applied.`,
  );
  for (const disclosure of snapshot.dataset.disclosures) {
    layout.heading(`${disclosure.id}. ${disclosure.title}`);
    const facts = report.facts.filter((fact) => fact.disclosureId === disclosure.id);
    if (facts.length === 0) {
      layout.note("No reportable value is included for this disclosure in this revision.");
      continue;
    }
    layout.facts(facts);
  }
  layout.heading("Supplementary information");
  layout.note("Scope 3 categories below were stored by the undertaking. They were not evaluated as Basic Module requirements.");
  if (report.supplementary.length === 0) {
    layout.note("No supplementary information is included in this revision.");
  }
  for (const item of report.supplementary) {
    layout.subheading(item.entryLabel);
    layout.note(item.limitation);
    for (const cell of item.cells) {
      layout.factLine(cell.label, cell.displayValue, cell.unit, cell.dimensionMember, cell.datapointId);
    }
  }
  layout.heading("Disclosures omitted under paragraph 22");
  layout.note("The omitted underlying information is not included. A structurally complete omission is the undertaking's attestation.");
  if (report.omissions.length === 0) {
    layout.note("No paragraph 22 omission is included in this revision.");
  }
  for (const item of report.omissions) {
    layout.factLine(item.label, `Omitted under ${item.reason}`, null, null, `${item.datapointId} · ${item.paragraph}`);
  }
  layout.heading("Report metadata");
  layout.paragraph(`Revision ${snapshot.revision}. Finalised at ${snapshot.finalisedAt}. Regulatory version ${snapshot.regulatoryVersion}.`);
  layout.paragraph("LibreVS prepared this file from the undertaking's finalised report. LibreVS is not the reporting undertaking and does not provide external assurance.");
  layout.finish();
  return pdf.save({ useObjectStreams: false });
}

class Layout {
  private page: PDFPage;
  private y: number;
  private readonly pages: PDFPage[] = [];

  constructor(
    private readonly pdf: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = this.addPage();
    this.y = PAGE_HEIGHT - MARGIN;
  }

  cover(snapshot: VerifiedReportSnapshot, title: string, year: string): void {
    this.draw(safe(this.bold, "LibreVS"), 11, this.bold, MUTED);
    this.gap(8);
    this.draw(safe(this.bold, title), 20, this.bold, INK, 28);
    this.gap(10);
    this.draw(safe(this.regular, "Sustainability report"), 12, this.regular, MUTED);
    this.gap(16);
    this.meta("Undertaking", snapshot.dataset.undertaking.name);
    this.meta("Reporting period", year);
    this.meta("Standard", "Commission Delegated Regulation (EU) 2026/1560");
    this.meta("Reporting option", "Option A — Basic Module");
    this.meta("Revision", String(snapshot.revision));
    this.meta("Finalised", snapshot.finalisedAt);
    this.gap(12);
    this.paragraph(REPORT_LIMITATIONS_NOTE);
  }

  heading(text: string): void {
    this.ensure(72);
    this.gap(12);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width: PAGE_WIDTH - MARGIN * 2, height: 1, color: RULE });
    this.gap(12);
    this.draw(safe(this.bold, text), 13, this.bold, INK, 18);
    this.gap(6);
  }

  subheading(text: string): void {
    this.ensure(48);
    this.draw(safe(this.bold, text), 11, this.bold, INK);
    this.gap(4);
  }

  paragraph(text: string): void {
    for (const line of wrap(this.regular, safe(this.regular, text), 10, PAGE_WIDTH - MARGIN * 2)) {
      this.ensure(14);
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 10, font: this.regular, color: INK });
      this.y -= 13;
    }
    this.gap(6);
  }

  note(text: string): void {
    for (const line of wrap(this.regular, safe(this.regular, text), 9, PAGE_WIDTH - MARGIN * 2)) {
      this.ensure(12);
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 9, font: this.regular, color: MUTED });
      this.y -= 12;
    }
    this.gap(4);
  }

  facts(facts: readonly PublicFact[]): void {
    const groups = new Map<string, PublicFact[]>();
    const order: string[] = [];
    for (const fact of facts) {
      const key = fact.entryLabel ?? "";
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)?.push(fact);
    }
    for (const key of order) {
      if (key !== "") {
        this.subheading(key);
      }
      for (const fact of groups.get(key) ?? []) {
        this.factLine(fact.label, fact.displayValue, fact.unit, fact.dimensionMember, `${fact.datapointId} · ${fact.paragraph}`);
      }
    }
  }

  factLine(label: string, value: string, unit: string | null, dimension: string | null, reference: string): void {
    const shown = [value, unit, dimension].filter((item) => item !== null && item !== "").join(" · ");
    this.ensure(28);
    this.draw(safe(this.bold, label), 10, this.bold, INK, 14);
    this.gap(2);
    for (const line of wrap(this.regular, safe(this.regular, shown), 10, PAGE_WIDTH - MARGIN * 2)) {
      this.ensure(13);
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 10, font: this.regular, color: INK });
      this.y -= 13;
    }
    this.draw(safe(this.regular, reference), 8, this.regular, MUTED);
    this.gap(6);
  }

  finish(): void {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      const label = `${index + 1} / ${total}`;
      const width = this.regular.widthOfTextAtSize(label, 9);
      page.drawText(label, {
        x: PAGE_WIDTH - MARGIN - width,
        y: 28,
        size: 9,
        font: this.regular,
        color: MUTED,
      });
    });
  }

  private meta(label: string, value: string): void {
    this.ensure(16);
    this.page.drawText(safe(this.bold, label), { x: MARGIN, y: this.y, size: 10, font: this.bold, color: MUTED });
    this.page.drawText(safe(this.regular, value), { x: MARGIN + 130, y: this.y, size: 10, font: this.regular, color: INK });
    this.y -= 16;
  }

  private draw(text: string, size: number, font: PDFFont, color: ReturnType<typeof rgb>, lineHeight = size + 3): void {
    const lines = wrap(font, text, size, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      this.ensure(lineHeight);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color });
      this.y -= lineHeight;
    }
  }

  private gap(amount: number): void {
    this.y -= amount;
  }

  private ensure(height: number): void {
    if (this.y - height < BOTTOM) {
      this.page = this.addPage();
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  private addPage(): PDFPage {
    const page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 18, width: PAGE_WIDTH, height: 18, color: BAND });
    this.pages.push(page);
    return page;
  }
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((word) => word.length > 0);
    let current = "";
    for (const word of words.length === 0 ? [""] : words) {
      const pieces = splitWord(font, word, size, width);
      for (const piece of pieces) {
        const next = current === "" ? piece : `${current} ${piece}`;
        if (font.widthOfTextAtSize(next, size) <= width) {
          current = next;
        } else {
          if (current !== "") {
            lines.push(current);
          }
          current = piece;
        }
      }
    }
    lines.push(current);
  }
  return lines.length === 0 ? [""] : lines;
}

function splitWord(font: PDFFont, word: string, size: number, width: number): string[] {
  if (word === "" || font.widthOfTextAtSize(word, size) <= width) {
    return [word];
  }
  const pieces: string[] = [];
  let current = "";
  for (const char of word) {
    const next = current + char;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
    } else {
      if (current !== "") {
        pieces.push(current);
      }
      current = char;
    }
  }
  if (current !== "") {
    pieces.push(current);
  }
  return pieces;
}

/**
 * Noto Sans covers the tested Latin, Greek, and Cyrillic characters.
 * A character outside that font is shown as its code point so the report still generates.
 * That fallback is not a claim of coverage for other scripts.
 */
function safe(font: PDFFont, text: string): string {
  let output = "";
  for (const char of text) {
    try {
      font.encodeText(char);
      output += char;
    } catch {
      const point = char.codePointAt(0) ?? 0;
      output += `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
    }
  }
  return output;
}
