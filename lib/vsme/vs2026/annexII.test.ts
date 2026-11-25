import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ANNEX_II_LEGAL_FIXTURE } from "./annexII.legal-fixture";
import {
  annexIIMembershipForEmployeeCategory,
  getAnnexIIRows,
  getAnnexIIRowsForEmployeeCategory,
} from "./annexII";
import type { EmployeeCategory } from "./types";

const BASIC_INCLUDED_AT_LE_10 = [
  ["B1", "Para 27, point (a), subpoints (i) and (ii)"],
  ["B1", "Para 27, point (c)"],
  ["B1", "Para 27, point (e), subpoints from (i) to (vii)"],
  ["B8", "Para 40, point (a)"],
  ["B8", "Para 40, point (b)"],
  ["B9", "Para 41, point (a)"],
  ["B10", "Para 42, point (a)"],
  ["B10", "Para 42, point (c)"],
  ["B10", "Para 42, point (d)"],
] as const;

const BASIC_EXCLUDED_AT_LE_10 = [
  ["B3", "Para 32, first sentence"],
  ["B3", "Para 33"],
  ["B6", "Para 36"],
  ["B7", "Para 38, first sentence"],
  ["B7", "Para 39, point (a)"],
  ["B7", "Para 39, point (b)"],
] as const;

const COMPREHENSIVE_ROWS = [
  ["C1", "Para 46, point (a)"],
  ["C1", "Para 46, point (b)"],
  ["C1", "Para 46, point (c)"],
  ["C5", "Para 58"],
  ["C6", "Para 61, point (a)"],
  ["C6", "Para 61, point (c)"],
  ["C7", "Para 62, point (a), subpoints from (i) to (v)"],
  ["C7", "Para 62, point (c), first sentence"],
] as const;

function identity(row: { disclosure: string; reference: string }): string {
  return `${row.disclosure} ${row.reference}`;
}

function parseAuditCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((columns) => columns.some((value) => value.length > 0))
    .map((columns) =>
      Object.fromEntries(header.map((name, column) => [name, columns[column] ?? ""])),
    );
}

/** The audit CSV drops "from" in two grouped references. The scope is unchanged. */
function auditReference(reference: string): string {
  return reference.replaceAll("subpoints from (", "subpoints (");
}

describe("Annex II registry", () => {
  it("matches the legal fixture and the verified audit CSV", () => {
    const rows = getAnnexIIRows();
    assert.equal(rows.length, 23);
    assert.equal(ANNEX_II_LEGAL_FIXTURE.length, 23);

    assert.deepEqual(
      rows.map((row) => ({
        disclosure: row.disclosure,
        reference: row.reference,
        topic: row.topic,
        employeesLe10: row.employeesLe10,
        employeesGt10: row.employeesGt10,
      })),
      ANNEX_II_LEGAL_FIXTURE,
    );

    const csvPath = fileURLToPath(
      new URL(
        "../../../docs/vs2026-audit/vs2026-annex-ii-mapping.csv",
        import.meta.url,
      ),
    );
    const auditRows = parseAuditCsv(readFileSync(csvPath, "utf8"));
    assert.equal(auditRows.length, 23);
    assert.deepEqual(
      rows.map((row) => `${row.disclosure}|${auditReference(row.reference)}`),
      auditRows.map((row) => `${row.disclosure}|${row.annex_ii_reference}`),
    );
    for (const [index, auditRow] of auditRows.entries()) {
      assert.equal(auditRow.verification_status, "VERIFIED");
      assert.equal(auditRow.employees_le_10, rows[index].employeesLe10 ? "INCLUDED" : "NOT_INCLUDED");
      assert.equal(auditRow.employees_gt_10, rows[index].employeesGt10 ? "INCLUDED" : "NOT_INCLUDED");
      assert.match(auditRow.source, /Regulation \(EU\) 2026\/1560 Annex II/);
    }
  });

  it("keeps a legal reference, a unique identity, and Regulation 2026/1560 on every row", () => {
    const rows = getAnnexIIRows();
    const identities = new Set(rows.map(identity));
    assert.equal(identities.size, 23);
    for (const row of rows) {
      assert.equal(row.legalInstrument, "Commission Delegated Regulation (EU) 2026/1560");
      assert.equal(row.celex, "32026R1560");
      assert.equal(row.eli, "http://data.europa.eu/eli/reg_del/2026/1560/oj");
      assert.equal(row.annex, "II");
      assert.equal(
        row.regulatorySource,
        "Commission Delegated Regulation (EU) 2026/1560, Annex II",
      );
      assert.ok(row.reference.length > 0);
      assert.ok(row.topic.length > 0);
    }
    assert.equal(
      rows[2].reference,
      "Para 27, point (e), subpoints from (i) to (vii)",
    );
    assert.equal(
      rows[21].reference,
      "Para 62, point (a), subpoints from (i) to (v)",
    );
  });

  it("includes nine rows at 10 employees or fewer and all 23 above 10", () => {
    const le10 = getAnnexIIRowsForEmployeeCategory("EMPLOYEES_LE_10");
    const gt10 = getAnnexIIRowsForEmployeeCategory("EMPLOYEES_GT_10");
    assert.equal(le10.length, 9);
    assert.equal(gt10.length, 23);
    assert.deepEqual(
      le10.map((row) => [row.disclosure, row.reference]),
      BASIC_INCLUDED_AT_LE_10,
    );
    assert.deepEqual(gt10.map(identity), getAnnexIIRows().map(identity));
  });

  it("excludes the eight Comprehensive rows at 10 or fewer and includes them above 10", () => {
    for (const [disclosure, reference] of COMPREHENSIVE_ROWS) {
      assert.equal(
        annexIIMembershipForEmployeeCategory(
          { disclosure, reference },
          "EMPLOYEES_LE_10",
        ).status,
        "NOT_MEMBER",
      );
      assert.equal(
        annexIIMembershipForEmployeeCategory(
          { disclosure, reference },
          "EMPLOYEES_GT_10",
        ).status,
        "MEMBER",
      );
    }
  });

  it("keeps Basic Module rows that are outside the 10-employee column out of that column only", () => {
    for (const [disclosure, reference] of BASIC_EXCLUDED_AT_LE_10) {
      assert.equal(
        annexIIMembershipForEmployeeCategory(
          { disclosure, reference },
          "EMPLOYEES_LE_10",
        ).status,
        "NOT_MEMBER",
      );
      assert.equal(
        annexIIMembershipForEmployeeCategory(
          { disclosure, reference },
          "EMPLOYEES_GT_10",
        ).status,
        "MEMBER",
      );
    }
    for (const [disclosure, reference] of BASIC_INCLUDED_AT_LE_10) {
      assert.equal(
        annexIIMembershipForEmployeeCategory(
          { disclosure, reference },
          "EMPLOYEES_LE_10",
        ).status,
        "MEMBER",
      );
    }
  });

  it("does not mutate the canonical dataset when a filtered copy is changed", () => {
    const before = getAnnexIIRows().map(identity);
    const filtered = [...getAnnexIIRowsForEmployeeCategory("EMPLOYEES_LE_10")];
    filtered.reverse();
    filtered.pop();
    assert.throws(() => {
      (filtered[0] as { employeesLe10: boolean }).employeesLe10 = false;
    });
    assert.deepEqual(getAnnexIIRows().map(identity), before);
    assert.equal(getAnnexIIRowsForEmployeeCategory("EMPLOYEES_LE_10").length, 9);
  });

  it("returns UNKNOWN_REFERENCE for a disclosure that Annex II does not list", () => {
    assert.deepEqual(
      annexIIMembershipForEmployeeCategory(
        { disclosure: "C1", reference: "Para 46, point (d)" },
        "EMPLOYEES_GT_10",
      ),
      { status: "UNKNOWN_REFERENCE" },
    );
    assert.deepEqual(
      annexIIMembershipForEmployeeCategory(
        { disclosure: "B9", reference: "Para 41, point (b)" },
        "EMPLOYEES_LE_10",
      ),
      { status: "UNKNOWN_REFERENCE" },
    );
    assert.equal(
      annexIIMembershipForEmployeeCategory(
        { disclosure: "", reference: "" },
        "EMPLOYEES_GT_10",
      ).status,
      "UNKNOWN_REFERENCE",
    );
  });

  it("rejects an unknown employee category", () => {
    assert.throws(() =>
      getAnnexIIRowsForEmployeeCategory("MICRO" as EmployeeCategory),
      /Unknown employee category/,
    );
  });
});
