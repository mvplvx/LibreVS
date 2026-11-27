import type { ReportFact, SupplementaryInformation, VS2026ReportDataset } from "./reportDataset";
import { registryDatapoint } from "./scalarEligibility";

/**
 * Preparation fields that explain a published figure or a reported scope decision.
 * Other PREPARATION_CONTEXT facts stay in the frozen dataset and are omitted here.
 */
const PUBLIC_CONTEXT = new Set([
  "B3_ENERGY_BREAKDOWN_INFORMATION",
  "B4_REPORTING_CONDITION",
  "B4_DISCLOSURE_METHOD",
  "B4_PUBLIC_DISCLOSURE_URL",
  "B4_POLLUTANT_REPORTING_BASIS",
  "B5_ASSESSED_SITE_REFERENCE",
  "B5_SITE_BSA_ASSESSMENT",
  "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
  "B6_WATER_STRESS_SITE_REFERENCE",
  "B7_SIGNIFICANT_MATERIAL_FLOWS",
  "B8_MEASUREMENT_BASIS",
  "B8_MULTI_COUNTRY_OPERATIONS",
  "B8_EMPLOYMENT_CONTRACT_COUNTRY",
  "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
  "B9_HOURS_WORKED_ORIGIN",
  "B9_ACCIDENT_RATE_BASIS",
  "B9_FATALITY_LEGAL_RESTRICTION",
  "B10_GENDER_PAY_GAP_LEGAL_OBLIGATION",
]);

const MONETARY = new Set(["B1_BALANCE_SHEET_TOTAL", "B1_TURNOVER", "B11_FINES_AMOUNT"]);

export const REPORT_LIMITATIONS_NOTE =
  "This report covers VS 2026 Option A, Basic Module, for an explicitly declared first year of reporting. Comprehensive disclosures and comparative figures are not included. The information is the undertaking's. LibreVS does not provide external assurance.";

export type PublicRole = "REPORTED" | "METHODOLOGY";

export type PublicFact = {
  disclosureId: string;
  datapointId: string;
  label: string;
  paragraph: string;
  rawValue: string;
  displayValue: string;
  unit: string | null;
  dimensionMember: string | null;
  entryLabel: string | null;
  role: PublicRole;
};

export type PublicOmission = {
  datapointId: string;
  label: string;
  paragraph: string;
  reason: string;
  attestation: "STRUCTURAL_UNDERTAKING_ATTESTATION";
};

export type PublicSupplementary = {
  entryLabel: string;
  limitation: string;
  cells: { datapointId: string; label: string; rawValue: string; displayValue: string; unit: string | null; dimensionMember: string }[];
};

export type PublicReport = {
  facts: PublicFact[];
  omissions: PublicOmission[];
  supplementary: PublicSupplementary[];
};

export class ReportRenderLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportRenderLimitError";
  }
}

const MAX_PUBLIC_ITEMS = 4_000;
const MAX_TEXT_CHARS = 1_500_000;

export function projectPublicReport(dataset: VS2026ReportDataset): PublicReport {
  const sites = siteLabels(dataset);
  const entryLabels = new Map<string, string>();
  let entrySequence = 0;
  const facts: PublicFact[] = [];
  for (const disclosure of dataset.disclosures) {
    for (const fact of disclosure.facts) {
      if (!isPublic(fact) || fact.reportedValue === null) {
        continue;
      }
      const entryLabel = entryLabelFor(fact, sites, entryLabels, () => {
        entrySequence += 1;
        return `Entry ${entrySequence}`;
      });
      facts.push({
        disclosureId: disclosure.id,
        datapointId: fact.datapointId,
        label: fact.label,
        paragraph: fact.paragraph,
        rawValue: fact.reportedValue,
        displayValue: displayValue(fact.reportedValue, fact.datapointId, sites),
        unit: displayUnit(fact, dataset.metadata.currency),
        dimensionMember: fact.dimensionMember,
        entryLabel,
        role: fact.publication === "PREPARATION_CONTEXT" ? "METHODOLOGY" : "REPORTED",
      });
    }
  }
  const omissions: PublicOmission[] = dataset.omittedDisclosures.map((item) => ({
    datapointId: item.datapointId,
    label: item.label,
    paragraph: item.paragraph,
    reason: item.reason ?? "paragraph 22",
    attestation: item.attestation,
  }));
  const supplementary = dataset.supplementaryInformation.map((item, index) => toSupplementary(item, index));
  const volume =
    facts.length +
    omissions.length +
    supplementary.reduce((sum, item) => sum + item.cells.length, 0);
  if (volume > MAX_PUBLIC_ITEMS) {
    throw new ReportRenderLimitError(
      "This report is larger than the VS 2026 render limit. Nothing was truncated. Reduce the number of repeating rows and finalise a new revision.",
    );
  }
  const characters =
    facts.reduce((sum, fact) => sum + fact.displayValue.length, 0) +
    supplementary.reduce((sum, item) => sum + item.cells.reduce((inner, cell) => inner + cell.displayValue.length, 0), 0);
  if (characters > MAX_TEXT_CHARS) {
    throw new ReportRenderLimitError(
      "This report text is larger than the VS 2026 render limit. Nothing was truncated.",
    );
  }
  return { facts, omissions, supplementary };
}

export function publicManifest(report: PublicReport): { key: string; datapointId: string; rawValue: string; displayValue: string }[] {
  const entries = report.facts.map((fact) => ({
    key: [fact.disclosureId, fact.datapointId, fact.entryLabel ?? "", fact.dimensionMember ?? ""].join("|"),
    datapointId: fact.datapointId,
    rawValue: fact.rawValue,
    displayValue: fact.displayValue,
  }));
  for (const item of report.supplementary) {
    for (const cell of item.cells) {
      entries.push({
        key: `supplementary|${cell.datapointId}|${item.entryLabel}|${cell.dimensionMember}`,
        datapointId: cell.datapointId,
        rawValue: cell.rawValue,
        displayValue: cell.displayValue,
      });
    }
  }
  for (const omission of report.omissions) {
    entries.push({
      key: `omission|${omission.datapointId}`,
      datapointId: omission.datapointId,
      rawValue: omission.reason,
      displayValue: omission.reason,
    });
  }
  return entries;
}

function isPublic(fact: ReportFact): boolean {
  if (fact.valueStatus === "EXCLUDED_UNVERIFIED_ORIGIN") {
    return false;
  }
  if (fact.publication === "REPORTED_FACT") {
    return true;
  }
  return fact.publication === "PREPARATION_CONTEXT" && PUBLIC_CONTEXT.has(fact.datapointId);
}

function displayValue(raw: string, datapointId: string, sites: ReadonlyMap<string, string>): string {
  const site = sites.get(raw);
  if (site && datapointId !== "B1_SITE_IDENTIFIER") {
    return site;
  }
  if (raw === "true") {
    return "Yes";
  }
  if (raw === "false") {
    return "No";
  }
  if (datapointId === "B1_NACE_CODES") {
    return formatNace(raw);
  }
  const definition = registryDatapoint(datapointId);
  if (definition?.value.kind === "ENUMERATION") {
    return definition.value.members.find((member) => member.id === raw)?.legalText ?? raw;
  }
  return raw;
}

function displayUnit(fact: ReportFact, currency: string): string | null {
  if (fact.unit) {
    return fact.unit;
  }
  if (MONETARY.has(fact.datapointId)) {
    return currency;
  }
  const kind = registryDatapoint(fact.datapointId)?.value.kind;
  if (kind === "PERCENTAGE" || kind === "PROPORTION") {
    return "%";
  }
  return null;
}

function formatNace(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed.join(", ");
    }
  } catch {
    return raw;
  }
  return raw;
}

function siteLabels(dataset: VS2026ReportDataset): Map<string, string> {
  const labels = new Map<string, string>();
  const rows: string[] = [];
  for (const fact of dataset.disclosures.flatMap((disclosure) => disclosure.facts)) {
    if (!fact.rowId || fact.repeatingGroupId !== "B1_SITE") {
      continue;
    }
    if (!rows.includes(fact.rowId)) {
      rows.push(fact.rowId);
    }
  }
  rows.forEach((rowId, index) => {
    const identifier = dataset.disclosures
      .flatMap((disclosure) => disclosure.facts)
      .find((fact) => fact.rowId === rowId && fact.datapointId === "B1_SITE_IDENTIFIER" && fact.reportedValue);
    labels.set(rowId, identifier?.reportedValue ?? `Site ${index + 1}`);
  });
  return labels;
}

function entryLabelFor(
  fact: ReportFact,
  sites: ReadonlyMap<string, string>,
  cache: Map<string, string>,
  nextEntry: () => string,
): string | null {
  if (!fact.rowId) {
    return null;
  }
  const cached = cache.get(fact.rowId);
  if (cached) {
    return cached;
  }
  const label = sites.get(fact.rowId) ?? nextEntry();
  cache.set(fact.rowId, label);
  return label;
}

function toSupplementary(item: SupplementaryInformation, index: number): PublicSupplementary {
  return {
    entryLabel: `Scope 3 entry ${index + 1}`,
    limitation: item.limitation,
    cells: item.cells.map((cell) => ({
      datapointId: cell.datapointId,
      label: cell.label,
      rawValue: cell.reportedValue,
      displayValue: cell.reportedValue,
      unit: cell.unit,
      dimensionMember: cell.dimensionMember,
    })),
  };
}
