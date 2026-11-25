import type { EmployeeCategory } from "./types";
import { VS2026_LEGAL_INSTRUMENTS } from "./types";

/**
 * One row of Annex II of Regulation (EU) 2026/1560.
 * A row is a legal disclosure, not a LibreVS field.
 * Inclusion flags are the Annex II table marks. They are not derived from
 * module, requirement type, or an XBRL concept.
 */
export type AnnexIIRow = {
  readonly legalInstrument: "Commission Delegated Regulation (EU) 2026/1560";
  readonly celex: "32026R1560";
  readonly eli: "http://data.europa.eu/eli/reg_del/2026/1560/oj";
  readonly annex: "II";
  readonly regulatorySource: "Commission Delegated Regulation (EU) 2026/1560, Annex II";
  readonly disclosure: string;
  readonly reference: string;
  readonly topic: string;
  readonly employeesLe10: boolean;
  readonly employeesGt10: boolean;
};

export type AnnexIIReferenceQuery = {
  readonly disclosure: string;
  readonly reference: string;
};

/**
 * Dataset membership only. A MEMBER result does not mean the value chain
 * cap applies to a commercial request.
 */
export type AnnexIIMembership =
  | { readonly status: "MEMBER"; readonly row: AnnexIIRow }
  | { readonly status: "NOT_MEMBER"; readonly row: AnnexIIRow }
  | { readonly status: "UNKNOWN_REFERENCE" };

const INSTRUMENT = VS2026_LEGAL_INSTRUMENTS.voluntaryStandard;

function annexRow(
  disclosure: string,
  reference: string,
  topic: string,
  employeesLe10: boolean,
  employeesGt10: boolean,
): AnnexIIRow {
  return Object.freeze({
    legalInstrument: INSTRUMENT.name,
    celex: INSTRUMENT.celex,
    eli: INSTRUMENT.eli,
    annex: "II",
    regulatorySource:
      "Commission Delegated Regulation (EU) 2026/1560, Annex II",
    disclosure,
    reference,
    topic,
    employeesLe10,
    employeesGt10,
  });
}

/**
 * Official Journal Annex II table order.
 * Grouped references keep the Official Journal scope, including the word
 * "from" in paragraphs 27(e) and 62(a).
 */
const ANNEX_II_ROWS: readonly AnnexIIRow[] = Object.freeze([
  annexRow(
    "B1",
    "Para 27, point (a), subpoints (i) and (ii)",
    "Selected module option (basic and/or comprehensive)",
    true,
    true,
  ),
  annexRow(
    "B1",
    "Para 27, point (c)",
    "Choice of reporting basis (individual or consolidated)",
    true,
    true,
  ),
  annexRow(
    "B1",
    "Para 27, point (e), subpoints from (i) to (vii)",
    "General undertaking's information",
    true,
    true,
  ),
  annexRow(
    "B3",
    "Para 32, first sentence",
    "Total energy consumption in MWh",
    false,
    true,
  ),
  annexRow(
    "B3",
    "Para 33",
    "Estimated absolute gross greenhouse gas (GHG) emissions",
    false,
    true,
  ),
  annexRow("B6", "Para 36", "Total water withdrawal", false, true),
  annexRow(
    "B7",
    "Para 38, first sentence",
    "Circular economy principles application",
    false,
    true,
  ),
  annexRow(
    "B7",
    "Para 39, point (a)",
    "Total weight of waste generated, with a breakdown between hazardous and non hazardous waste",
    false,
    true,
  ),
  annexRow(
    "B7",
    "Para 39, point (b)",
    "Proportion of waste diverted to recycling or reuse",
    false,
    true,
  ),
  annexRow(
    "B8",
    "Para 40, point (a)",
    "Number of employees (in headcount or full-time equivalent) per type of employment contract",
    true,
    true,
  ),
  annexRow(
    "B8",
    "Para 40, point (b)",
    "Number of employees (in headcount or full-time equivalent) per gender",
    true,
    true,
  ),
  annexRow(
    "B9",
    "Para 41, point (a)",
    "Number and rate of recordable work-related accidents",
    true,
    true,
  ),
  annexRow(
    "B10",
    "Para 42, point (a)",
    "Whether the employees receive pay that is equal or above applicable minimum wage for the country it reports on",
    true,
    true,
  ),
  annexRow(
    "B10",
    "Para 42, point (c)",
    "Percentage of employees covered by collective bargaining agreements",
    true,
    true,
  ),
  annexRow(
    "B10",
    "Para 42, point (d)",
    "Average number of annual training hours per employee",
    true,
    true,
  ),
  annexRow(
    "C1",
    "Para 46, point (a)",
    "Description of significant groups of products and/or services offered",
    false,
    true,
  ),
  annexRow(
    "C1",
    "Para 46, point (b)",
    "Description of significant market(s) the undertaking operates in",
    false,
    true,
  ),
  annexRow(
    "C1",
    "Para 46, point (c)",
    "Description of main business relationships",
    false,
    true,
  ),
  annexRow("C5", "Para 58", "Employee turnover rate", false, true),
  annexRow(
    "C6",
    "Para 61, point (a)",
    "Code of conduct or human rights policy",
    false,
    true,
  ),
  annexRow(
    "C6",
    "Para 61, point (c)",
    "Complaints-handling mechanism",
    false,
    true,
  ),
  annexRow(
    "C7",
    "Para 62, point (a), subpoints from (i) to (v)",
    "Confirmed incidents in its own workforce",
    false,
    true,
  ),
  annexRow(
    "C7",
    "Para 62, point (c), first sentence",
    "Confirmed incidents involving workers in the value chain, affected communities, consumers and end-users",
    false,
    true,
  ),
]);

function assertEmployeeCategory(category: EmployeeCategory): void {
  if (category !== "EMPLOYEES_LE_10" && category !== "EMPLOYEES_GT_10") {
    throw new TypeError(
      `Unknown employee category: ${String(category)}. Expected EMPLOYEES_LE_10 or EMPLOYEES_GT_10.`,
    );
  }
}

function includedFor(
  row: AnnexIIRow,
  category: EmployeeCategory,
): boolean {
  return category === "EMPLOYEES_LE_10"
    ? row.employeesLe10
    : row.employeesGt10;
}

/** Copy of the canonical Annex II rows. Mutating the copy does not change the dataset. */
export function getAnnexIIRows(): readonly AnnexIIRow[] {
  return ANNEX_II_ROWS.slice();
}

/** Rows whose Annex II column is marked for the given employee category. */
export function getAnnexIIRowsForEmployeeCategory(
  category: EmployeeCategory,
): readonly AnnexIIRow[] {
  assertEmployeeCategory(category);
  return ANNEX_II_ROWS.filter((row) => includedFor(row, category));
}

/**
 * Exact disclosure and reference match against one Annex II column.
 * UNKNOWN_REFERENCE means the pair is not an Annex II row.
 * NOT_MEMBER means the row exists and that employee column is empty.
 */
export function annexIIMembershipForEmployeeCategory(
  query: AnnexIIReferenceQuery,
  category: EmployeeCategory,
): AnnexIIMembership {
  assertEmployeeCategory(category);
  const row = ANNEX_II_ROWS.find(
    (candidate) =>
      candidate.disclosure === query.disclosure &&
      candidate.reference === query.reference,
  );
  if (!row) {
    return { status: "UNKNOWN_REFERENCE" };
  }
  if (!includedFor(row, category)) {
    return { status: "NOT_MEMBER", row };
  }
  return { status: "MEMBER", row };
}
