import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import {
  B3_ANNEX_II_REFERENCES,
  B3_COMPLETION_IDS,
  B3_OUTSIDE_COMPLETION_IDS,
  B3_REMOVED_LEGACY_IDS,
  B3_REQUIRED_STATEMENTS,
} from "./b3.legal-fixture";
import {
  B3_DISCLOSURE,
  B3_FOLDED_BREAKDOWN_IDS,
  B3_NOT_CARRIED_FORWARD,
  B3_REPLACED_SCOPE3_SLOT_IDS,
  annexIIFor,
  b3AnnexIDatapoints,
  b3Datapoints,
} from "./index";

const registryDir = fileURLToPath(new URL(".", import.meta.url));
const auditDir = fileURLToPath(new URL("../../../../docs/vs2026-audit/", import.meta.url));

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((cells) => cells.some((value) => value !== ""))
    .map((cells) =>
      Object.fromEntries(header.map((key, column) => [key, cells[column] ?? ""])),
    );
}

function listed(ids: readonly string[], id: string): boolean {
  return ids.some((candidate) => candidate === id);
}

describe("VS 2026 B3 registry", () => {
  it("represents paragraph 32 and paragraph 33 as separate reported facts", () => {
    assert.equal(B3_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.equal(B3_DISCLOSURE.id, "B3");
    const ids = b3Datapoints().map((datapoint) => datapoint.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      b3AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B3_COMPLETION_IDS],
    );
    const total = b3Datapoints().find((datapoint) => datapoint.id === "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    const electricity = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
    );
    const fuels = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_ENERGY_CONSUMPTION_FROM_FUELS",
    );
    assert.equal(total?.value.kind, "QUANTITY");
    assert.equal(total?.requirementType, "ESSENTIAL");
    assert.equal(total?.applicability.kind, "ALWAYS");
    if (total?.value.kind === "QUANTITY") {
      assert.equal(total.value.reportedUnit, "MWh");
    }
    assert.equal(electricity?.applicability.kind, "WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED");
    assert.equal(fuels?.applicability.kind, "WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED");
    for (const datapoint of [electricity, fuels]) {
      assert.equal(datapoint?.value.kind, "DIMENSIONED_QUANTITY");
      if (datapoint?.value.kind === "DIMENSIONED_QUANTITY") {
        const members = datapoint.value.axes.flatMap((axis) => axis.legalMembers);
        assert.equal(members.includes("Renewable energy"), true);
        assert.equal(members.includes("Non-renewable energy"), true);
        assert.equal(members.includes("Electricity (as reflected in utility billings)") || members.includes("Fuels"), true);
      }
      assert.equal(datapoint?.annexII.listed, false);
    }
    const gate = b3Datapoints().find((datapoint) => datapoint.id === "B3_ENERGY_BREAKDOWN_INFORMATION");
    assert.equal(gate?.informationClass, "PREPARATION_DATA");
    assert.equal(gate?.validationNote?.includes("not zero"), true);
    const scope1 = b3Datapoints().find((datapoint) => datapoint.id === "B3_GROSS_SCOPE1_TCO2E");
    const scope2 = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
    );
    assert.equal(scope1?.value.kind, "QUANTITY");
    assert.equal(scope2?.value.kind, "QUANTITY");
    if (scope1?.value.kind === "QUANTITY" && scope2?.value.kind === "QUANTITY") {
      assert.equal(scope1.value.reportedUnit, "tCO2eq");
      assert.equal(scope2.value.reportedUnit, "tCO2eq");
    }
    assert.equal(scope1?.id === scope2?.id, false);
  });

  it("keeps employee-size relief apart from applicability and from Annex II", () => {
    for (const id of ["B3_TOTAL_ENERGY_CONSUMPTION_MWH", "B3_GROSS_SCOPE1_TCO2E", "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E"]) {
      const datapoint = b3Datapoints().find((item) => item.id === id);
      assert.equal(datapoint?.employeeSizeRule.voluntaryForEmployeesLe10, true);
      assert.equal(datapoint?.applicability.kind, "ALWAYS");
      assert.equal(datapoint?.requirementType, "ESSENTIAL");
      assert.equal(annexIIFor(datapoint!.annexII, "EMPLOYEES_LE_10").status, "NOT_MEMBER");
      assert.equal(annexIIFor(datapoint!.annexII, "EMPLOYEES_GT_10").status, "MEMBER");
    }
    const references = b3Datapoints()
      .filter((datapoint) => datapoint.annexII.listed)
      .map((datapoint) => (datapoint.annexII.listed ? datapoint.annexII.reference : ""));
    assert.deepEqual([...new Set(references)].sort(), [...B3_ANNEX_II_REFERENCES].sort());
    const breakdown = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
    );
    assert.equal(breakdown?.employeeSizeRule.voluntaryForEmployeesLe10, true);
    assert.equal(annexIIFor(breakdown!.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED");
  });

  it("keeps intensity, market-based Scope 2 and Scope 3 out of the completion set", () => {
    const ids = new Set(b3Datapoints().map((datapoint) => datapoint.id));
    for (const id of B3_REMOVED_LEGACY_IDS) {
      assert.equal(ids.has(id), false);
    }
    assert.deepEqual(
      B3_NOT_CARRIED_FORWARD.map((item) => item.legacyId),
      [...B3_REMOVED_LEGACY_IDS],
    );
    const market = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_GROSS_SCOPE2_MARKET_BASED_TCO2E",
    );
    assert.equal(market?.informationClass, "SUPPLEMENTARY");
    assert.equal(market?.annexII.listed, false);
    assert.equal(b3AnnexIDatapoints().some((datapoint) => datapoint.id === market?.id), false);
    const scope3 = b3Datapoints().find((datapoint) => datapoint.id === "B3_GROSS_SCOPE3_TCO2E");
    assert.equal(scope3?.requirementType, "SECTOR_CONSIDERATION");
    assert.equal(scope3?.informationClass, "SUPPLEMENTARY");
    assert.equal(scope3?.employeeSizeRule.voluntaryForEmployeesLe10, false);
    const categories = b3Datapoints().find(
      (datapoint) => datapoint.id === "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
    );
    assert.equal(categories?.value.kind, "REPEATING_QUANTITY");
    if (categories?.value.kind === "REPEATING_QUANTITY") {
      assert.equal(categories.value.maximum, null);
      assert.equal(categories.value.cardinality, "ZERO_OR_MORE");
    }
    for (const id of B3_REPLACED_SCOPE3_SLOT_IDS) {
      assert.equal(ids.has(id), false);
    }
    assert.equal(B3_DISCLOSURE.presentationNotes?.[0]?.implemented, false);
    assert.deepEqual(
      b3Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B3_OUTSIDE_COMPLETION_IDS],
    );
  });

  it("stores no emission factors and matches the audit identities", () => {
    const source = readFileSync(`${registryDir}b3.ts`, "utf8");
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b3.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(/\d+\.\d+/.test(source), false);
    const text = [
      ...b3Datapoints().map((datapoint) => datapoint.regulatoryStatement),
      ...(B3_DISCLOSURE.presentationNotes ?? []).map((note) => note.statement),
    ].join("\n");
    for (const statement of B3_REQUIRED_STATEMENTS) {
      assert.equal(text.includes(statement), true, statement);
    }
    for (const datapoint of b3Datapoints()) {
      if (datapoint.calculation) {
        assert.equal(datapoint.calculation.emissionFactors, "NONE");
        assert.equal(datapoint.calculation.formula, "NOT_IMPLEMENTED");
        assert.equal(datapoint.calculation.missingInput, "DO_NOT_TREAT_AS_ZERO");
      }
    }
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const b3Rows = matrix.filter((row) => row.disclosure === "B3");
    const removed = b3Rows.filter((row) => row.change_class === "REMOVED").map((row) => row.existing_librevs_id);
    assert.deepEqual(removed.sort(), [...B3_REMOVED_LEGACY_IDS].sort());
    const ids = new Set(b3Datapoints().map((datapoint) => datapoint.id));
    for (const row of b3Rows) {
      const proposed = row.proposed_vs2026_internal_id;
      if (row.change_class === "REMOVED" || proposed === "") {
        assert.equal(ids.has(row.existing_librevs_id), false);
        continue;
      }
      const accounted =
        ids.has(proposed) ||
        listed(B3_FOLDED_BREAKDOWN_IDS, proposed) ||
        listed(B3_REPLACED_SCOPE3_SLOT_IDS, proposed);
      assert.equal(accounted, true, proposed);
    }
    const efrag = parseCsv(readFileSync(`${auditDir}vs2026-efrag-mapping.csv`, "utf8"));
    const verified = new Set(
      efrag
        .filter((row) => row.verification_status === "VERIFIED" && row.efrag_xbrl_concept.startsWith("vs:"))
        .map((row) => row.efrag_xbrl_concept),
    );
    for (const datapoint of b3Datapoints()) {
      if (datapoint.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
        assert.equal(datapoint.knowledgeHub.url.includes("2025-07-30-ec-rec"), false);
      }
      if (datapoint.xbrl.status === "VERIFIED") {
        assert.equal(verified.has(datapoint.xbrl.qname), true, datapoint.xbrl.qname);
      } else {
        assert.equal("qname" in datapoint.xbrl, false);
      }
    }
  });
});
