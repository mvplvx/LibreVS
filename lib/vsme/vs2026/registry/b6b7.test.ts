import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getAnnexIIRows } from "../annexII";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import { B1_DISCLOSURE } from "./b1";
import {
  B6_B7_ANNEX_II_REFERENCES,
  B6_B7_IDS_ADDED_BEYOND_MATRIX,
  B6_COMPLETION_IDS,
  B6_OUTSIDE_COMPLETION_IDS,
  B6_REQUIRED_STATEMENTS,
  B7_COMPLETION_IDS,
  B7_OUTSIDE_COMPLETION_IDS,
  B7_REQUIRED_STATEMENTS,
} from "./b6b7.legal-fixture";
import {
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B7_FOLDED_PROPOSED_IDS,
  annexIIFor,
  b1b2Datapoints,
  b3Datapoints,
  b4Datapoints,
  b5Datapoints,
  b6AnnexIDatapoints,
  b6Datapoints,
  b7AnnexIDatapoints,
  b7Datapoints,
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

function byId(id: string) {
  return [...b6Datapoints(), ...b7Datapoints()].find((datapoint) => datapoint.id === id);
}

describe("VS 2026 B6 and B7 registry", () => {
  it("keeps water withdrawal, consumption, and water stress distinct", () => {
    assert.equal(B6_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.deepEqual(
      b6AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B6_COMPLETION_IDS],
    );
    const withdrawal = byId("B6_TOTAL_WATER_WITHDRAWAL_M3");
    const consumption = byId("B6_WATER_CONSUMPTION_PRODUCTION_M3");
    const stress = byId("B6_WATER_CONSUMED_WATER_STRESS_M3");
    const discharge = byId("B6_WATER_DISCHARGE_PRODUCTION_M3");
    assert.equal(withdrawal?.requirementType, "ESSENTIAL");
    assert.equal(withdrawal?.applicability.kind, "ALWAYS");
    assert.equal(withdrawal?.value.kind, "QUANTITY");
    if (withdrawal?.value.kind === "QUANTITY") {
      assert.equal(withdrawal.value.reportedUnit, "m3");
    }
    assert.equal(consumption?.applicability.kind, "WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST");
    assert.equal(consumption?.id === withdrawal?.id, false);
    assert.equal(stress?.id === withdrawal?.id, false);
    assert.equal(consumption?.calculation?.status, "INCOMPLETE");
    assert.equal(consumption?.calculation?.formula, "NOT_IMPLEMENTED");
    assert.deepEqual(consumption?.calculation?.inputs, [
      "B6_PRODUCTION_PROCESS_WITHDRAWAL_M3",
      "B6_WATER_DISCHARGE_PRODUCTION_M3",
    ]);
    assert.equal(consumption?.calculation?.excludes?.includes("B6_TOTAL_WATER_WITHDRAWAL_M3"), true);
    assert.equal(discharge?.informationClass, "PREPARATION_DATA");
    assert.equal(discharge?.xbrl.status, "VERIFIED");
    const condition = byId("B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES");
    assert.equal(condition?.informationClass, "PREPARATION_DATA");
    if (condition?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        condition.value.members.map((member) => member.id),
        ["PROCESSES_EXIST", "NO_SUCH_PROCESSES_IDENTIFIED"],
      );
    }
    assert.equal(condition?.validationNote?.includes("UNASSESSED is not NO_SUCH_PROCESSES_IDENTIFIED"), true);
    assert.equal(condition?.validationNote?.includes("NACE"), true);
    const group = B6_DISCLOSURE.repeatingGroups[0];
    assert.equal(group?.maximum, null);
    assert.equal(group?.cardinality, "ZERO_OR_MORE");
    assert.equal(group?.siteInventory, "B1_SITE");
    const site = byId("B6_WATER_STRESS_SITE_REFERENCE");
    assert.equal(site?.value.kind, "SITE_REFERENCE");
    if (site?.value.kind === "SITE_REFERENCE") {
      assert.equal(site.value.identifierDatapointId, "B1_SITE_IDENTIFIER");
      assert.equal(site.value.createsSecondInventory, false);
    }
    assert.equal(
      B1_DISCLOSURE.repeatingGroups.some((item) => item.id === "B1_SITE" && item.maximum === null),
      true,
    );
    const assessment = byId("B6_WATER_STRESS_ASSESSMENT");
    assert.equal(assessment?.validationNote?.includes("free from water stress"), true);
    assert.equal(stress?.xbrl.status, "VERIFIED");
    if (stress?.xbrl.status === "VERIFIED") {
      assert.equal(stress.xbrl.note?.includes("empty paragraph"), true);
    }
    for (const datapoint of b6Datapoints()) {
      if (datapoint.value.kind === "QUANTITY") {
        assert.equal(datapoint.calculation?.missingInput, "DO_NOT_TREAT_AS_ZERO");
        assert.equal(datapoint.calculation?.reportedZero, "DISTINCT_FROM_MISSING");
      }
    }
    assert.deepEqual(
      b6Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B6_OUTSIDE_COMPLETION_IDS],
    );
  });

  it("keeps one waste proportion and an open material list", () => {
    assert.equal(B7_DISCLOSURE.title, "Resource use, circular economy and waste management");
    assert.deepEqual(
      b7AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B7_COMPLETION_IDS],
    );
    const applies = byId("B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES");
    const description = byId("B7_CIRCULAR_ECONOMY_DESCRIPTION");
    assert.equal(applies?.value.kind, "ENUMERATION");
    if (applies?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        applies.value.members.map((member) => member.id),
        ["YES", "NO"],
      );
    }
    assert.equal(applies?.validationNote?.includes("An unanswered value is not NO."), true);
    assert.equal(description?.applicability.kind, "WHEN_CIRCULAR_ECONOMY_PRINCIPLES_ARE_APPLIED");
    assert.equal(byId("B7_WASTE_HAZARDOUS_MASS")?.id === byId("B7_WASTE_NON_HAZARDOUS_MASS")?.id, false);
    const proportion = byId("B7_WASTE_DIVERTED_PROPORTION");
    const recycling = byId("B7_WASTE_RECYCLING_PERCENT_MASS");
    const preparation = byId("B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS");
    assert.equal(proportion?.informationClass, "REGULATORY_FACT");
    assert.equal(proportion?.value.kind, "PROPORTION");
    if (proportion?.value.kind === "PROPORTION") {
      assert.equal(proportion.value.zeroDenominator, "NOT_A_VALID_PERCENTAGE");
      assert.equal(proportion.value.missingDenominator, "NOT_ZERO_PERCENT");
    }
    assert.equal(recycling?.informationClass, "DIGITAL_FACT");
    assert.equal(preparation?.informationClass, "DIGITAL_FACT");
    assert.equal(b7AnnexIDatapoints().some((datapoint) => datapoint.id === recycling?.id), false);
    assert.equal(proportion?.calculation?.safeguards?.includes("The two percentages are not added."), true);
    assert.equal(recycling?.calculation?.formula, "NOT_IMPLEMENTED");
    const materials = B7_DISCLOSURE.repeatingGroups[0];
    assert.equal(materials?.id, "B7_MATERIAL");
    assert.equal(materials?.maximum, null);
    assert.equal(materials?.cardinality, "ZERO_OR_MORE");
    const materialWeight = byId("B7_MATERIAL_WEIGHT");
    const materialVolume = byId("B7_MATERIAL_VOLUME");
    assert.equal(materialWeight?.value.kind, "QUANTITY");
    assert.equal(materialVolume?.informationClass, "DIGITAL_FACT");
    if (materialWeight?.value.kind === "QUANTITY" && materialVolume?.value.kind === "QUANTITY") {
      assert.equal(materialWeight.value.reportedUnit, "WEIGHT");
      assert.equal(materialVolume.value.reportedUnit, "VOLUME");
    }
    assert.equal(
      byId("B7_SIGNIFICANT_MATERIAL_FLOWS")?.applicability.kind,
      "ALWAYS",
    );
    assert.equal(
      byId("B7_MATERIAL_NAME")?.applicability.kind,
      "WHEN_SIGNIFICANT_MATERIAL_FLOWS",
    );
    assert.deepEqual(
      b7Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B7_OUTSIDE_COMPLETION_IDS],
    );
  });

  it("applies the square-bracket relief without turning it into Annex II membership", () => {
    const canonical = getAnnexIIRows().filter(
      (row) => row.disclosure === "B6" || row.disclosure === "B7",
    );
    assert.deepEqual(
      canonical.map((row) => row.reference),
      [...B6_B7_ANNEX_II_REFERENCES],
    );
    for (const datapoint of [...b6Datapoints(), ...b7Datapoints()]) {
      assert.equal(datapoint.employeeSizeRule.voluntaryForEmployeesLe10, true);
      assert.equal(datapoint.requirementType === "ESSENTIAL" || datapoint.requirementType === "IF_APPLICABLE", true);
    }
    const withdrawal = byId("B6_TOTAL_WATER_WITHDRAWAL_M3");
    assert.equal(withdrawal?.requirementType, "ESSENTIAL");
    assert.equal(withdrawal?.applicability.kind, "ALWAYS");
    assert.equal(annexIIFor(withdrawal!.annexII, "EMPLOYEES_LE_10").status, "NOT_MEMBER");
    assert.equal(annexIIFor(withdrawal!.annexII, "EMPLOYEES_GT_10").status, "MEMBER");
    for (const id of [
      "B6_WATER_CONSUMPTION_PRODUCTION_M3",
      "B6_WATER_CONSUMED_WATER_STRESS_M3",
      "B7_CIRCULAR_ECONOMY_DESCRIPTION",
      "B7_MATERIAL_WEIGHT",
      "B7_WASTE_RECYCLING_PERCENT_MASS",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED", id);
    }
    for (const id of [
      "B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES",
      "B7_WASTE_GENERATED_TOTAL_WEIGHT",
      "B7_WASTE_HAZARDOUS_MASS",
      "B7_WASTE_NON_HAZARDOUS_MASS",
      "B7_WASTE_DIVERTED_PROPORTION",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_LE_10").status, "NOT_MEMBER", id);
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "MEMBER", id);
    }
    const source = ["b6.ts", "b7.ts"]
      .map((name) => readFileSync(`${registryDir}${name}`, "utf8"))
      .join("\n");
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b6b7.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("radius"), false);
    assert.equal(/\d+\.\d+/.test(source), false);
  });

  it("matches the legal sentences and the audited mappings", () => {
    const text = [...b6Datapoints(), ...b7Datapoints()]
      .flatMap((datapoint) => [
        datapoint.regulatoryStatement,
        datapoint.validationNote ?? "",
        ...(datapoint.calculation?.safeguards ?? []),
        ...(datapoint.futureValidation ?? []),
      ])
      .join("\n");
    for (const statement of [...B6_REQUIRED_STATEMENTS, ...B7_REQUIRED_STATEMENTS]) {
      assert.equal(text.includes(statement), true, statement);
    }
    const known = new Set([
      ...b1b2Datapoints(true).map((datapoint) => datapoint.id),
      ...b3Datapoints().map((datapoint) => datapoint.id),
      ...b4Datapoints().map((datapoint) => datapoint.id),
      ...b5Datapoints().map((datapoint) => datapoint.id),
      ...b6Datapoints().map((datapoint) => datapoint.id),
      ...b7Datapoints().map((datapoint) => datapoint.id),
    ]);
    assert.equal(
      known.size,
      b1b2Datapoints(true).length +
        b3Datapoints().length +
        b4Datapoints().length +
        b5Datapoints().length +
        b6Datapoints().length +
        b7Datapoints().length,
    );
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const rows = matrix.filter((row) => row.disclosure === "B6" || row.disclosure === "B7");
    assert.equal(rows.some((row) => row.change_class === "REMOVED"), false);
    const registryIds = new Set([...b6Datapoints(), ...b7Datapoints()].map((datapoint) => datapoint.id));
    for (const row of rows) {
      assert.equal(row.employee_size_rule, "VOLUNTARY_FOR_EMPLOYEES_LE_10", row.proposed_vs2026_internal_id);
      const proposed = row.proposed_vs2026_internal_id;
      const accounted = registryIds.has(proposed) || listed(B7_FOLDED_PROPOSED_IDS, proposed);
      assert.equal(accounted, true, proposed);
    }
    for (const id of registryIds) {
      const proposed = rows.some((row) => row.proposed_vs2026_internal_id === id);
      assert.equal(proposed || listed(B6_B7_IDS_ADDED_BEYOND_MATRIX, id), true, id);
    }
    const hub = parseCsv(readFileSync(`${auditDir}vs2026-knowledgehub-mapping.csv`, "utf8"));
    const publishable = new Set(
      hub.filter((row) => row.publish_knowledge_hub_url === "YES").map((row) => row.proposed_url),
    );
    const efrag = parseCsv(readFileSync(`${auditDir}vs2026-efrag-mapping.csv`, "utf8"));
    const verified = new Set(
      efrag
        .filter((row) => row.verification_status === "VERIFIED" && row.efrag_xbrl_concept.startsWith("vs:"))
        .map((row) => row.efrag_xbrl_concept),
    );
    for (const datapoint of [...b6Datapoints(), ...b7Datapoints()]) {
      if (datapoint.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
        assert.equal(publishable.has(datapoint.knowledgeHub.url), true, datapoint.id);
        assert.equal(datapoint.knowledgeHub.url.includes("2025-07-30-ec-rec"), false);
      } else {
        assert.equal(datapoint.knowledgeHub.legalSourceUrl, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard.eli);
        assert.equal("url" in datapoint.knowledgeHub, false);
      }
      if (datapoint.xbrl.status === "VERIFIED") {
        assert.equal(verified.has(datapoint.xbrl.qname), true, datapoint.xbrl.qname);
        assert.equal(datapoint.xbrl.qname.includes("|"), false);
      } else {
        assert.equal("qname" in datapoint.xbrl, false);
      }
      if (datapoint.calculation) {
        assert.equal(datapoint.calculation.emissionFactors, "NONE");
        assert.equal(datapoint.calculation.formula, "NOT_IMPLEMENTED");
      }
    }
    for (const id of ["B7_WASTE_GENERATED_TOTAL_WEIGHT", "B7_WASTE_HAZARDOUS_MASS", "B7_WASTE_NON_HAZARDOUS_MASS"]) {
      assert.equal(byId(id)?.knowledgeHub.status, "UNAVAILABLE", id);
      assert.equal(byId(id)?.xbrl.status, "UNVERIFIED", id);
    }
  });
});
