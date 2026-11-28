import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import ExcelJS from "exceljs";

import { proposedConformityStatement, type ReportFact, type VS2026ReportDataset } from "./reportDataset";
import { renderFinalReportFile } from "./reportJson";
import { projectPublicReport, publicManifest, ReportRenderLimitError } from "./reportPublication";
import { renderVS2026Pdf } from "./reportPdf";
import {
  buildSnapshotSeal,
  verifyStoredSnapshot,
  VS2026_INTEGRITY_SCHEME_2,
  type StoredSnapshotRow,
} from "./reportSeal";
import { renderVS2026Xlsx } from "./reportXlsx";
import { editorDisclosures } from "./scalarEligibility";

const LONG_TEXT = `${"Göteborg och Malmö ".repeat(80)}STARTTOKEN ${"narrative ".repeat(200)}ENDTOKEN`;
const PROTECTED = "SECRET-991-OMITTED";
const FORMULA = "=HYPERLINK(\"https://evil.example\")";
const URL = "https://example.test/pollutants";

function reported(input: Partial<ReportFact> & Pick<ReportFact, "datapointId" | "reportedValue">): ReportFact {
  return {
    label: input.label ?? input.datapointId,
    paragraph: input.paragraph ?? "27",
    repeatingGroupId: input.repeatingGroupId ?? null,
    requirementType: "ESSENTIAL",
    applicability: "ALWAYS",
    legalApplicability: "APPLICABLE",
    employeeSizeTreatment: "NO_RELIEF",
    completionStatus: "COMPLETE",
    valueStatus: input.reportedValue === "0" ? "REPORTED_ZERO" : input.reportedValue === "false" ? "REPORTED_FALSE" : "PRESENT",
    outputRole: "REPORTED",
    informationClass: "REGULATORY_FACT",
    publication: "REPORTED_FACT",
    unit: null,
    dimensionMember: null,
    rowId: null,
    ...input,
  };
}

function dataset(): VS2026ReportDataset {
  const byDisclosure = new Map<string, ReportFact[]>();
  for (const disclosure of editorDisclosures()) {
    byDisclosure.set(disclosure.id, []);
  }
  const add = (disclosureId: string, fact: ReportFact) => {
    byDisclosure.get(disclosureId)?.push(fact);
  };
  add("B1", reported({ datapointId: "B1_LEGAL_FORM", reportedValue: "Aktiebolag", paragraph: "27(e)(i)" }));
  add("B1", reported({ datapointId: "B1_NACE_CODES", reportedValue: "[\"01.11\",\"62.01\"]", paragraph: "27(e)(ii)" }));
  add("B1", reported({ datapointId: "B1_TURNOVER", reportedValue: "0", unit: "SEK", paragraph: "27(e)(iv)" }));
  add("B1", reported({ datapointId: "B1_REPORTING_BASIS", reportedValue: "INDIVIDUAL", paragraph: "27(c)" }));
  add("B1", reported({
    datapointId: "B1_SITE_IDENTIFIER",
    reportedValue: "Plant Göteborg",
    paragraph: "27(e)(vii)",
    repeatingGroupId: "B1_SITE",
    rowId: "site-labelled",
  }));
  add("B1", reported({
    datapointId: "B1_SITE_GPS_LOCATION",
    reportedValue: "59.33,18.07",
    paragraph: "27(e)(vii)",
    repeatingGroupId: "B1_SITE",
    rowId: "unlabeled-site-row",
  }));
  add("B2", reported({ datapointId: "B2_HAS_PRACTICES", reportedValue: "false", paragraph: "29" }));
  add("B2", reported({ datapointId: "B2_SEPARATE_ESG_POLICIES", reportedValue: LONG_TEXT, paragraph: "29" }));
  add("B2", reported({ datapointId: "B2_SEPARATE_ESG_POLICIES", reportedValue: null, paragraph: "29", valueStatus: "MISSING" }));
  add("B3", reported({ datapointId: "B3_GROSS_SCOPE1_TCO2E", reportedValue: "12.5", unit: "tCO2eq", paragraph: "33" }));
  add("B3", reported({ datapointId: "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E", reportedValue: "-3.5", unit: "tCO2eq", paragraph: "33" }));
  add("B3", reported({
    datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
    reportedValue: "0",
    unit: "MWh",
    dimensionMember: "Renewable energy",
    paragraph: "32",
  }));
  add("B3", reported({
    datapointId: "B3_ENERGY_BREAKDOWN_INFORMATION",
    reportedValue: "CANNOT_OBTAIN",
    publication: "PREPARATION_CONTEXT",
    informationClass: "PREPARATION_DATA",
    paragraph: "32",
  }));
  add("B4", reported({ datapointId: "B4_PUBLIC_DISCLOSURE_URL", reportedValue: URL, publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "34" }));
  add("B4", reported({ datapointId: "B4_POLLUTANT_IDENTITY", reportedValue: FORMULA, paragraph: "34", repeatingGroupId: "B4_POLLUTANT", rowId: "pollutant-formula" }));
  for (let index = 1; index <= 40; index += 1) {
    add("B4", reported({
      datapointId: "B4_POLLUTANT_IDENTITY",
      reportedValue: `Pollutant ${String(index).padStart(2, "0")}`,
      paragraph: "34",
      repeatingGroupId: "B4_POLLUTANT",
      rowId: `pollutant-${index}`,
    }));
  }
  add("B5", reported({ datapointId: "B5_BSA_NAME", reportedValue: "Natura 2000 site", paragraph: "35", rowId: "b5-row", repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP" }));
  add("B5", reported({ datapointId: "B5_RELATIONSHIP_SITE_REFERENCE", reportedValue: "site-labelled", paragraph: "35", rowId: "b5-row", repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP" }));
  add("B5", reported({ datapointId: "B5_RELATIONSHIP_BASIS", reportedValue: "INTERNAL-BSA-NOTE", publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "35" }));
  add("B6", reported({ datapointId: "B6_TOTAL_WATER_WITHDRAWAL_M3", reportedValue: "8", unit: "m3", paragraph: "37" }));
  add("B7", reported({ datapointId: "B7_WASTE_DIVERTED_PROPORTION", reportedValue: "0", paragraph: "39(b)" }));
  add("B8", reported({ datapointId: "B8_EMPLOYEES_BY_COUNTRY", reportedValue: "4", paragraph: "40(c)", rowId: "country-se", repeatingGroupId: "B8_EMPLOYEES_BY_COUNTRY" }));
  add("B8", reported({
    datapointId: "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
    reportedValue: "SE",
    publication: "PREPARATION_CONTEXT",
    informationClass: "PREPARATION_DATA",
    paragraph: "40(c)",
    rowId: "country-se",
    repeatingGroupId: "B8_EMPLOYEES_BY_COUNTRY",
  }));
  add("B9", reported({ datapointId: "B9_RECORDABLE_ACCIDENTS", reportedValue: "2", paragraph: "41(a)" }));
  add("B9", reported({ datapointId: "B9_RECORDABLE_ACCIDENT_RATE", reportedValue: "1.5", paragraph: "41(a)" }));
  add("B9", reported({ datapointId: "B9_ACCIDENT_RATE_BASIS", reportedValue: "BASIS_200000_HOURS", publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "41(a)" }));
  add("B9", reported({ datapointId: "B9_HOURS_WORKED", reportedValue: "99999", publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "41(a)" }));
  add("B10", reported({ datapointId: "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", reportedValue: "false", paragraph: "42(a)" }));
  add("B10", reported({ datapointId: "B10_MINIMUM_WAGE_DETERMINATION", reportedValue: "INTERNAL-WAGE-METHOD", publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "42(a)" }));
  add("B11", reported({ datapointId: "B11_CONVICTIONS_COUNT", reportedValue: "1", paragraph: "43" }));
  add("B11", reported({ datapointId: "B11_FINES_AMOUNT", reportedValue: "1500", unit: "SEK", paragraph: "43" }));
  add("B11", reported({ datapointId: "B11_CONVICTIONS_AND_FINES_ASSESSMENT", reportedValue: "INTERNAL-ASSESSMENT", publication: "PREPARATION_CONTEXT", informationClass: "PREPARATION_DATA", paragraph: "43" }));
  const statement = proposedConformityStatement({ undertakingName: "Nordic Example AB", year: 2026 });
  return {
    metadata: {
      format: "librevs-vs2026-report",
      formatVersion: "1",
      regulatoryInstrument: "Commission Delegated Regulation (EU) 2026/1560",
      regulatoryVersion: "EU-2026/1560",
      annex: "I",
      status: "FINAL",
      reportingPeriodId: "period-1",
      year: 2026,
      reportingOption: "OPTION_A",
      currency: "SEK",
    },
    undertaking: { name: "Nordic Example AB", currency: "SEK" },
    basisOfPreparation: {
      reportingOption: "OPTION_A",
      comparativeBasis: "FIRST_YEAR",
      currency: "SEK",
      organisationalBoundary: "INDIVIDUAL",
      comparativeInformation: "NOT_IMPLEMENTED",
      unchangedInformationReferences: "NOT_IMPLEMENTED",
      implementationNote: "First-year limitation.",
    },
    disclosures: editorDisclosures().map((disclosure) => ({
      id: disclosure.id,
      title: disclosure.title,
      facts: byDisclosure.get(disclosure.id) ?? [],
    })),
    supplementaryInformation: [
      {
        kind: "SCOPE_3_CATEGORY",
        evaluation: "NOT_EVALUATED_AS_BASIC_MODULE",
        limitation: "This Scope 3 category was stored by the undertaking. It is supplementary.",
        rowId: "scope3-1",
        position: 0,
        cells: [
          { datapointId: "B3_SCOPE3_CATEGORY_VALUE", label: "Scope 3 category", reportedValue: "3.5", unit: "tCO2eq", dimensionMember: "Category 1" },
        ],
      },
    ],
    omittedDisclosures: [
      {
        datapointId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
        label: "total energy consumption",
        paragraph: "32",
        rowId: null,
        reason: "22(b)",
        reassessedForPeriod: true,
        conditionsAssessed: true,
        attestation: "STRUCTURAL_UNDERTAKING_ATTESTATION",
        independentLegalApproval: false,
      },
    ],
    validation: {
      readiness: "READY_FOR_REVIEW",
      complianceClaim: "NOT_EVALUATED",
      comparativeBasis: "FIRST_YEAR",
      issues: [],
      unsupportedDisclosures: [],
      provenanceExclusions: [],
      limitations: [],
    },
    conformityStatement: {
      text: statement,
      acceptedBy: "AUTHENTICATED_ORGANISATION_USER",
      legalEffect: "UNDERTAKING_DECLARATION",
      assuranceOpinion: false,
    },
  };
}

function snapshotFor(report: VS2026ReportDataset) {
  const finalisedAt = new Date("2026-11-27T12:00:00.000Z");
  const sealed = buildSnapshotSeal({
    dataset: report,
    reportingPeriodId: report.metadata.reportingPeriodId,
    organizationId: "org-1",
    companyId: "company-1",
    revision: 3,
    regulatoryVersion: "EU-2026/1560",
    reportingOption: "OPTION_A",
    conformityStatement: report.conformityStatement?.text ?? "",
    finalisedByUserId: "user-1",
    finalisedAt: finalisedAt.toISOString(),
  });
  return {
    verified: {
      snapshotId: "snap-1",
      revision: 3,
      finalisedAt: finalisedAt.toISOString(),
      regulatoryVersion: "EU-2026/1560" as const,
      reportingOption: "OPTION_A" as const,
      conformityStatement: report.conformityStatement?.text ?? "",
      contentHash: sealed.datasetHash,
      integrityVersion: VS2026_INTEGRITY_SCHEME_2,
      dataset: report,
    },
    sealed,
    finalisedAt,
  };
}

function rowFrom(report: VS2026ReportDataset, patch: Partial<StoredSnapshotRow> = {}): StoredSnapshotRow {
  const built = snapshotFor(report);
  return {
    id: "snap-1",
    reportingPeriodId: "period-1",
    organizationId: "org-1",
    companyId: "company-1",
    revision: 3,
    regulatoryVersion: "EU-2026/1560",
    reportingOption: "OPTION_A",
    dataset: report,
    conformityStatement: report.conformityStatement?.text ?? "",
    contentHash: built.sealed.datasetHash,
    integrityVersion: VS2026_INTEGRITY_SCHEME_2,
    sealHash: built.sealed.sealHash,
    finalisedByUserId: "user-1",
    finalisedAt: built.finalisedAt,
    ...patch,
  };
}

async function workbookText(bytes: Uint8Array): Promise<{ text: string; formulas: number; numbers: number[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const parts: string[] = [];
  let formulas = 0;
  const numbers: number[] = [];
  workbook.eachSheet((sheet) => {
    parts.push(sheet.name);
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value;
        if (value && typeof value === "object" && "formula" in value) {
          formulas += 1;
        }
        if (typeof value === "number") {
          numbers.push(value);
        }
        parts.push(cellText(value));
      });
    });
  });
  return { text: parts.join("\n"), formulas, numbers };
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object" && "formula" in value) {
    return String(value.formula);
  }
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

function extractPdfText(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes);
  const source = buffer.toString("latin1");
  const maps = new Map<string, Map<string, string>>();
  for (const match of source.matchAll(/\/BaseFont\s*\/(NotoSans-[A-Za-z]+)[\s\S]{0,400}?\/ToUnicode\s+(\d+)\s+0\s+R/g)) {
    maps.set(match[1], toUnicodeMap(objectStream(buffer, match[2])));
  }
  const parts: string[] = [];
  for (const stream of pdfStreams(buffer)) {
    if (!stream.includes(" Tj") && !stream.includes(" TJ")) {
      continue;
    }
    parts.push(decodeContent(stream, maps));
  }
  return parts.join("\n");
}

function objectStream(buffer: Buffer, objectId: string): string {
  const marker = `${objectId} 0 obj`;
  const start = buffer.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const next = buffer.indexOf("endobj", start);
  return pdfStreams(buffer.subarray(start, next < 0 ? buffer.length : next)).join("\n");
}

function pdfStreams(bytes: Uint8Array): string[] {
  const buffer = Buffer.from(bytes);
  const streams: string[] = [];
  let index = 0;
  while (index < buffer.length) {
    const start = buffer.indexOf("stream", index);
    if (start < 0) {
      break;
    }
    let dataStart = start + "stream".length;
    if (buffer[dataStart] === 0x0d) {
      dataStart += 1;
    }
    if (buffer[dataStart] === 0x0a) {
      dataStart += 1;
    }
    const end = buffer.indexOf("endstream", dataStart);
    if (end < 0) {
      break;
    }
    let slice = buffer.subarray(dataStart, end);
    if (slice[slice.length - 1] === 0x0a) {
      slice = slice.subarray(0, slice.length - 1);
    }
    if (slice[slice.length - 1] === 0x0d) {
      slice = slice.subarray(0, slice.length - 1);
    }
    try {
      slice = inflateSync(slice);
    } catch {
      // The stream is already uncompressed.
    }
    streams.push(slice.toString("latin1"));
    index = end + "endstream".length;
  }
  return streams;
}

function toUnicodeMap(stream: string): Map<string, string> {
  const map = new Map<string, string>();
  collectToUnicode(stream, map);
  return map;
}

function collectToUnicode(stream: string, map: Map<string, string>): void {
  for (const block of stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(glyphKey(pair[1]), utf16Hex(pair[2]));
    }
  }
  for (const block of stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const start = Number.parseInt(range[1], 16);
      const values = [...range[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((item) => utf16Hex(item[1]));
      values.forEach((value, offset) => {
        map.set(glyphKey((start + offset).toString(16)), value);
      });
    }
    for (const range of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const start = Number.parseInt(range[1], 16);
      const end = Number.parseInt(range[2], 16);
      const dest = Number.parseInt(range[3], 16);
      for (let code = start; code <= end; code += 1) {
        map.set(glyphKey(code.toString(16)), String.fromCharCode(dest + (code - start)));
      }
    }
  }
}

function glyphKey(hex: string): string {
  return hex.toUpperCase().padStart(4, "0");
}

function utf16Hex(hex: string): string {
  const units: number[] = [];
  for (let index = 0; index < hex.length; index += 4) {
    units.push(Number.parseInt(hex.slice(index, index + 4).padEnd(4, "0"), 16));
  }
  return String.fromCharCode(...units);
}

function decodeGlyphHex(hex: string, map: Map<string, string>): { text: string; count: number } {
  let text = "";
  let count = 0;
  for (let index = 0; index < hex.length; index += 4) {
    const char = map.get(glyphKey(hex.slice(index, index + 4))) ?? "";
    if (char !== "") {
      count += 1;
    }
    text += char;
  }
  return { text, count };
}

function decodeContent(content: string, maps: Map<string, Map<string, string>>): string {
  const values: string[] = [];
  let font = "NotoSans-Regular";
  for (const token of content.matchAll(/\/(NotoSans-[A-Za-z]+)[^\s]*\s+[0-9.]+\s+Tf|\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>/g)) {
    if (token[0].includes(" Tf")) {
      font = token[1] ?? font;
      continue;
    }
    if (token[2]) {
      const hex = token[2].replace(/\s+/g, "");
      const map = maps.get(font);
      if (map && hex.length >= 4 && hex.length % 4 === 0) {
        values.push(decodeGlyphHex(hex, map).text);
        continue;
      }
      if (hex.length % 2 === 0 && hex.length > 0) {
        values.push(Buffer.from(hex, "hex").toString("latin1"));
      }
      continue;
    }
    values.push(unescapePdf(token[0].slice(1, -1)));
  }
  return values.join("");
}

function unescapePdf(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      output += char;
      continue;
    }
    const next = value[index + 1] ?? "";
    if (/[0-7]/.test(next)) {
      const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      output += String.fromCharCode(Number.parseInt(octal, 8));
      index += octal.length;
      continue;
    }
    const mapped: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "\\": "\\", "(": "(", ")": ")" };
    output += mapped[next] ?? next;
    index += 1;
  }
  return output;
}

describe("VS 2026 multi-format report rendering", () => {
  it("projects public facts and keeps preparation inputs out of the external report", () => {
    const report = projectPublicReport(dataset());
    const ids = report.facts.map((fact) => fact.datapointId);
    assert.equal(ids.includes("B1_LEGAL_FORM"), true);
    assert.equal(ids.includes("B9_RECORDABLE_ACCIDENT_RATE"), true);
    assert.equal(ids.includes("B9_ACCIDENT_RATE_BASIS"), true);
    assert.equal(ids.includes("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE"), true);
    assert.equal(ids.includes("B10_MINIMUM_WAGE_DETERMINATION"), false);
    assert.equal(ids.includes("B11_CONVICTIONS_AND_FINES_ASSESSMENT"), false);
    assert.equal(ids.includes("B9_HOURS_WORKED"), false);
    assert.equal(ids.includes("B5_RELATIONSHIP_BASIS"), false);
    assert.equal(report.facts.find((fact) => fact.datapointId === "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE")?.displayValue, "No");
    assert.equal(report.facts.some((fact) => fact.rawValue === "0"), true);
    assert.equal(report.facts.find((fact) => fact.datapointId === "B1_TURNOVER")?.displayValue, "0");
    assert.equal(report.facts.find((fact) => fact.datapointId === "B1_NACE_CODES")?.displayValue, "01.11, 62.01");
    assert.equal(report.facts.find((fact) => fact.datapointId === "B5_RELATIONSHIP_SITE_REFERENCE")?.displayValue, "Plant Göteborg");
    assert.equal(report.facts.some((fact) => fact.entryLabel === "Site 2"), true);
    assert.equal(report.omissions[0]?.reason, "22(b)");
    assert.equal(JSON.stringify(report).includes(PROTECTED), false);
  });

  it("renders the same finalised snapshot to JSON, XLSX and PDF", async () => {
    const report = dataset();
    const { verified } = snapshotFor(report);
    const json = renderFinalReportFile({
      snapshotId: verified.snapshotId,
      revision: verified.revision,
      finalisedAt: verified.finalisedAt,
      finalisedByUserId: "user-1",
      contentHash: verified.contentHash,
      dataset: report,
    });
    const xlsx = await renderVS2026Xlsx(verified);
    const pdf = await renderVS2026Pdf(verified);
    const sheet = await workbookText(xlsx);
    const pdfText = extractPdfText(pdf);
    assert.equal(json.includes("\"revision\":3"), true);
    assert.equal(json.includes("Nordic Example AB"), true);
    assert.equal(json.includes("prepared in conformity with"), true);
    assert.equal(json.includes("Option A — Basic Module"), true);
    assert.equal(json.includes(PROTECTED), false);
    assert.equal(sheet.formulas, 0);
    assert.equal(sheet.text.includes("Nordic Example AB"), true);
    assert.equal(sheet.text.includes("Revision"), true);
    assert.equal(sheet.text.includes("3"), true);
    assert.equal(sheet.text.includes("01.11, 62.01"), true);
    assert.equal(sheet.text.includes("SE"), true);
    assert.equal(sheet.numbers.includes(0), true);
    assert.equal(sheet.numbers.includes(-3.5), true);
    assert.equal(sheet.text.includes("No"), true);
    assert.equal(sheet.text.includes(FORMULA) || sheet.text.includes(`'${FORMULA}`), true);
    assert.equal(sheet.text.includes(URL), true);
    assert.equal(sheet.text.includes("3.5"), true);
    assert.equal(sheet.text.includes("supplementary"), true);
    assert.equal(sheet.text.includes("22(b)"), true);
    assert.equal(sheet.text.includes(PROTECTED), false);
    assert.equal(sheet.text.includes("INTERNAL-WAGE-METHOD"), false);
    assert.equal(sheet.text.includes("INTERNAL-ASSESSMENT"), false);
    assert.equal(sheet.text.includes("99999"), false);
    assert.equal(pdfText.includes("Nordic Example AB"), true);
    assert.equal(pdfText.includes("Option A"), true);
    assert.equal(pdfText.includes("Revision 3"), true);
    assert.equal(pdfText.includes("Plant G") && pdfText.includes("teborg"), true);
    assert.equal(pdfText.includes("Malmö"), true);
    assert.equal(pdfText.includes("STARTTOKEN"), true);
    assert.equal(pdfText.includes("ENDTOKEN"), true);
    assert.equal(pdfText.includes("01.11, 62.01"), true);
    assert.equal(pdfText.includes("Site 2"), true);
    assert.equal(pdfText.includes("unlabeled-site-row"), false);
    assert.equal(pdfText.includes("-3.5"), true);
    assert.equal(pdfText.includes("tCO2eq"), true);
    assert.equal(pdfText.includes("MWh"), true);
    assert.equal(pdfText.includes("m3"), true);
    assert.equal(pdfText.includes("No"), true);
    assert.equal(pdfText.includes("3.5"), true);
    assert.equal(pdfText.includes("not evaluated as Basic Module") || pdfText.includes("not evaluated as Basic Module requirements") || pdfText.includes("were not evaluated as Basic Module"), true);
    assert.equal(pdfText.includes("22(b)"), true);
    assert.equal(pdfText.includes(PROTECTED), false);
    assert.equal(pdfText.includes("INTERNAL-WAGE-METHOD"), false);
    assert.equal(pdfText.includes("user-1"), false);
    for (let index = 1; index <= 40; index += 1) {
      const name = `Pollutant ${String(index).padStart(2, "0")}`;
      assert.equal(pdfText.includes(name), true, name);
      assert.equal(sheet.text.includes(name), true, name);
    }
    assert.equal(pdfText.includes("2 / "), true);
    const manifest = publicManifest(projectPublicReport(report));
    assert.ok(manifest.length > 20);
    for (const entry of manifest) {
      assert.equal(json.includes(entry.datapointId), true, entry.datapointId);
      assert.equal(sheet.text.includes(entry.datapointId), true, entry.datapointId);
      assert.equal(pdfText.includes(entry.datapointId), true, entry.datapointId);
      const compact = (text: string) => text.replace(/\s+/g, "");
      const represented = (text: string) => compact(text).includes(compact(entry.displayValue)) || text.includes(entry.rawValue);
      assert.equal(json.includes(JSON.stringify(entry.rawValue).slice(1, -1)), true, entry.key);
      assert.equal(represented(sheet.text), true, entry.key);
      assert.equal(represented(pdfText), true, entry.key);
    }
  });

  it("keeps scheme 1 snapshots valid and seals new finalisation metadata", () => {
    const report = dataset();
    const current = rowFrom(report);
    assert.equal(verifyStoredSnapshot(current).ok, true);
    const moved = rowFrom(report, { finalisedAt: new Date("2026-11-28T12:00:00.000Z") });
    assert.equal(verifyStoredSnapshot(moved).ok, false);
    const legacy = rowFrom(report, { integrityVersion: null, sealHash: null });
    assert.equal(verifyStoredSnapshot(legacy).ok, true);
    const legacyDate = rowFrom(report, {
      integrityVersion: null,
      sealHash: null,
      finalisedAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    assert.equal(verifyStoredSnapshot(legacyDate).ok, true);
    const legacyVersion = rowFrom(report, { integrityVersion: null, sealHash: null, regulatoryVersion: "2.0.0" });
    assert.equal(verifyStoredSnapshot(legacyVersion).ok, false);
    const statement = proposedConformityStatement({ undertakingName: "Nordic Example AB", year: 2026 });
    assert.match(statement, /Nordic Example AB/);
    assert.match(statement, /2026/);
    assert.match(statement, /Commission Delegated Regulation \(EU\) 2026\/1560/);
    assert.match(statement, /Option A — Basic Module/);
    assert.match(statement, /prepared in conformity with/);
    assert.match(statement, /not an assurance opinion/);
  });

  it("refuses an oversized projection instead of truncating it", () => {
    const report = dataset();
    const facts = report.disclosures[3]?.facts ?? [];
    for (let index = 0; index < 4_100; index += 1) {
      facts.push(reported({ datapointId: "B4_POLLUTANT_IDENTITY", reportedValue: `Extra ${index}`, rowId: `extra-${index}` }));
    }
    assert.throws(() => projectPublicReport(report), ReportRenderLimitError);
  });

  it("renders tested European characters as glyphs", async () => {
    const samples = [
      "ÅÄÖåäö",
      "ÆØÅæøå",
      "ÄÖÜß",
      "Łłęś",
      "ČčŠšŽž",
      "Ελληνικά",
      "Українська",
      "“quoted”",
      "range–em—",
      "100%",
      "€",
    ];
    const report = dataset();
    report.undertaking.name = `Example ${samples.join(" ")}`;
    const legalForm = report.disclosures
      .find((disclosure) => disclosure.id === "B1")
      ?.facts.find((fact) => fact.datapointId === "B1_LEGAL_FORM");
    if (legalForm) {
      legalForm.reportedValue = samples.join("\n");
    }
    const { verified } = snapshotFor(report);
    const pdf = await renderVS2026Pdf(verified);
    const text = extractPdfText(pdf);
    for (const sample of samples) {
      assert.equal(text.includes(sample), true, sample);
      const point = sample.codePointAt(0) ?? 0;
      assert.equal(text.includes(`U+${point.toString(16).toUpperCase().padStart(4, "0")}`), false, sample);
    }
  });

  it("does not query the database or the regulatory evaluator from a renderer", () => {
    for (const name of ["reportPdf.ts", "reportXlsx.ts", "reportPublication.ts"]) {
      const source = readFileSync(join(import.meta.dirname, name), "utf8");
      assert.equal(source.includes("prisma"), false, name);
      assert.equal(source.includes("evaluateVS2026ReportingState"), false, name);
      assert.equal(source.includes("loadVS2026EvaluationInput"), false, name);
      assert.equal(source.includes("exportMapping"), false, name);
    }
  });
});
