import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getAnnexIIRows } from "../annexII";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import {
  B10_B11_ANNEX_II_REFERENCES,
  B10_B11_IDS_ADDED_BEYOND_MATRIX,
  B10_COMPLETION_IDS,
  B10_OUTSIDE_COMPLETION_IDS,
  B10_REQUIRED_STATEMENTS,
  B11_COMPLETION_IDS,
  B11_OUTSIDE_COMPLETION_IDS,
  B11_REQUIRED_STATEMENTS,
} from "./b10b11.legal-fixture";
import {
  B10_DISCLOSURE,
  B10_NOT_CARRIED_FORWARD,
  B11_DISCLOSURE,
  annexIIFor,
  b10AnnexIDatapoints,
  b10Datapoints,
  b11AnnexIDatapoints,
  b11Datapoints,
  b1b2Datapoints,
  b3Datapoints,
  b4Datapoints,
  b5Datapoints,
  b6Datapoints,
  b7Datapoints,
  b8Datapoints,
  b9Datapoints,
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
  return [...b10Datapoints(), ...b11Datapoints()].find((datapoint) => datapoint.id === id);
}

describe("VS 2026 B10 and B11 registry", () => {
  it("keeps minimum wage, the pay gap, coverage, and one training average distinct", () => {
    assert.equal(B10_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.equal(B10_DISCLOSURE.title, "Workforce – Remuneration, collective bargaining and training");
    assert.deepEqual(
      b10AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B10_COMPLETION_IDS],
    );
    assert.deepEqual(
      b10Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B10_OUTSIDE_COMPLETION_IDS],
    );
    const wage = byId("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE");
    const determination = byId("B10_MINIMUM_WAGE_DETERMINATION");
    assert.equal(wage?.paragraph, "42(a)");
    assert.equal(wage?.applicability.kind, "WHEN_APPLICABLE_MINIMUM_REMUNERATION_IS_IDENTIFIED");
    if (wage?.value.kind === "ENUMERATION" && determination?.value.kind === "ENUMERATION") {
      assert.deepEqual(wage.value.members.map((member) => member.id), ["YES", "NO"]);
      assert.deepEqual(
        determination.value.members.map((member) => member.id),
        [
          "STATUTORY_MINIMUM_WAGE",
          "COLLECTIVELY_AGREED_MINIMUM_REMUNERATION",
          "NO_APPLICABLE_MINIMUM_IDENTIFIED",
          "DETERMINATION_UNRESOLVED",
        ],
      );
    }
    assert.equal(wage?.validationNote?.includes("UNASSESSED is not NO."), true);
    assert.equal(determination?.dataSourceNote?.includes("B8_EMPLOYMENT_CONTRACT_COUNTRY"), true);
    const gap = byId("B10_GENDER_PAY_GAP_PERCENT");
    assert.equal(gap?.paragraph, "42(b)");
    assert.equal(gap?.requirementType, "IF_APPLICABLE");
    assert.equal(gap?.applicability.kind, "WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED");
    assert.equal(gap?.value.kind, "PERCENTAGE");
    if (gap?.value.kind === "PERCENTAGE") {
      assert.equal(gap.value.bounds, "NOT_ASSUMED");
      assert.equal(gap.value.missingValue, "DO_NOT_TREAT_AS_ZERO");
    }
    assert.equal(byId("B10_AVERAGE_FEMALE_REMUNERATION")?.informationClass, "PREPARATION_DATA");
    assert.equal(byId("B10_AVERAGE_FEMALE_REMUNERATION")?.value.kind, "MONETARY");
    const coverage = byId("B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT");
    assert.equal(coverage?.paragraph, "42(c)");
    if (coverage?.value.kind === "PERCENTAGE") {
      assert.equal(coverage.value.bounds, "ZERO_TO_100");
      assert.equal(coverage.value.zeroDenominator, "NOT_A_VALID_PERCENTAGE");
    }
    assert.deepEqual(coverage?.calculation?.inputs, [
      "B10_EMPLOYEES_COVERED_BY_COLLECTIVE_BARGAINING",
      "B10_COLLECTIVE_BARGAINING_DENOMINATOR",
    ]);
    assert.equal(byId("B10_COLLECTIVE_BARGAINING_DENOMINATOR")?.value.kind, "COUNT");
    const training = byId("B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE");
    assert.equal(training?.paragraph, "42(d)");
    assert.equal(training?.value.kind, "HOURS_AVERAGE");
    if (training?.value.kind === "HOURS_AVERAGE") {
      assert.equal(training.value.denominator, "HEADCOUNT");
      assert.equal(training.value.doNotReuseFte, true);
      assert.equal(training.value.missingValue, "DO_NOT_TREAT_AS_ZERO");
    }
    assert.equal(b10Datapoints().some((datapoint) => datapoint.id.includes("GENDER") && datapoint.paragraph === "42(d)"), false);
    for (const legacyId of B10_NOT_CARRIED_FORWARD) {
      assert.equal(b10Datapoints().some((datapoint) => datapoint.id === legacyId), false, legacyId);
    }
  });

  it("keeps convictions and fines separate and event-based", () => {
    assert.equal(B11_DISCLOSURE.title, "Convictions and fines for corruption and bribery");
    assert.deepEqual(
      b11AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B11_COMPLETION_IDS],
    );
    assert.deepEqual(
      b11Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B11_OUTSIDE_COMPLETION_IDS],
    );
    const convictions = byId("B11_CONVICTIONS_COUNT");
    const fines = byId("B11_FINES_AMOUNT");
    assert.equal(convictions?.paragraph, "43");
    assert.equal(fines?.paragraph, "43");
    assert.equal(convictions?.id === fines?.id, false);
    assert.equal(convictions?.applicability.kind, "WHEN_RELEVANT_CONVICTIONS_OCCURRED");
    assert.equal(fines?.applicability.kind, "WHEN_RELEVANT_FINES_INCURRED");
    assert.equal(convictions?.value.kind, "COUNT");
    if (convictions?.value.kind === "COUNT") {
      assert.equal(convictions.value.nonNegativeInteger, true);
      assert.equal(convictions.value.reportedZero, "DISTINCT_FROM_MISSING");
      assert.equal(convictions.value.missingCount, "DO_NOT_TREAT_AS_ZERO");
    }
    assert.equal(fines?.value.kind, "MONETARY");
    if (fines?.value.kind === "MONETARY") {
      assert.equal(fines.value.currency, "REPORTING_CURRENCY");
    }
    const assessment = byId("B11_CONVICTIONS_AND_FINES_ASSESSMENT");
    if (assessment?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        assessment.value.members.map((member) => member.id),
        ["CONVICTIONS_OCCURRED", "FINES_OCCURRED", "BOTH_OCCURRED", "NEITHER_AFTER_ASSESSMENT"],
      );
    }
    assert.equal(convictions?.calculation?.excludes?.includes("B11_FINES_AMOUNT"), true);
    assert.equal(fines?.calculation?.excludes?.includes("B11_CONVICTIONS_COUNT"), true);
  });

  it("applies no square-bracket relief and the Annex II rows as listed", () => {
    const canonical = getAnnexIIRows().filter(
      (row) => row.disclosure === "B10" || row.disclosure === "B11",
    );
    assert.deepEqual(
      canonical.map((row) => row.reference),
      [...B10_B11_ANNEX_II_REFERENCES],
    );
    for (const datapoint of [...b10Datapoints(), ...b11Datapoints()]) {
      assert.equal(datapoint.employeeSizeRule.voluntaryForEmployeesLe10, false, datapoint.id);
    }
    for (const id of [
      "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE",
      "B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT",
      "B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_LE_10").status, "MEMBER", id);
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "MEMBER", id);
    }
    for (const id of [
      "B10_GENDER_PAY_GAP_PERCENT",
      "B10_MINIMUM_WAGE_DETERMINATION",
      "B11_CONVICTIONS_COUNT",
      "B11_FINES_AMOUNT",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_LE_10").status, "NOT_LISTED", id);
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED", id);
    }
    const source = ["b10.ts", "b11.ts"]
      .map((name) => readFileSync(`${registryDir}${name}`, "utf8"))
      .join("\n");
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b10b11.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("voluntaryForEmployeesLe10: true"), false);
    assert.equal(source.includes("criminal record"), false);
    assert.equal(/\d+\.\d+/.test(source), false);
  });

  it("matches the legal sentences and the audited mappings", () => {
    const text = [...b10Datapoints(), ...b11Datapoints()]
      .flatMap((datapoint) => [
        datapoint.regulatoryStatement,
        datapoint.validationNote ?? "",
        datapoint.dataSourceNote ?? "",
        ...(datapoint.value.kind === "ENUMERATION"
          ? datapoint.value.members.map((member) => member.legalText)
          : []),
        ...(datapoint.calculation?.safeguards ?? []),
      ])
      .join("\n");
    for (const statement of [...B10_REQUIRED_STATEMENTS, ...B11_REQUIRED_STATEMENTS]) {
      assert.equal(text.includes(statement), true, statement);
    }
    const known = new Set([
      ...b1b2Datapoints(true).map((datapoint) => datapoint.id),
      ...b3Datapoints().map((datapoint) => datapoint.id),
      ...b4Datapoints().map((datapoint) => datapoint.id),
      ...b5Datapoints().map((datapoint) => datapoint.id),
      ...b6Datapoints().map((datapoint) => datapoint.id),
      ...b7Datapoints().map((datapoint) => datapoint.id),
      ...b8Datapoints().map((datapoint) => datapoint.id),
      ...b9Datapoints().map((datapoint) => datapoint.id),
      ...b10Datapoints().map((datapoint) => datapoint.id),
      ...b11Datapoints().map((datapoint) => datapoint.id),
    ]);
    assert.equal(
      known.size,
      b1b2Datapoints(true).length +
        b3Datapoints().length +
        b4Datapoints().length +
        b5Datapoints().length +
        b6Datapoints().length +
        b7Datapoints().length +
        b8Datapoints().length +
        b9Datapoints().length +
        b10Datapoints().length +
        b11Datapoints().length,
    );
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const rows = matrix.filter((row) => row.disclosure === "B10" || row.disclosure === "B11");
    const registryIds = new Set([...b10Datapoints(), ...b11Datapoints()].map((datapoint) => datapoint.id));
    for (const row of rows) {
      assert.equal(row.employee_size_rule, "NONE", row.proposed_vs2026_internal_id);
      assert.equal(registryIds.has(row.proposed_vs2026_internal_id), true, row.proposed_vs2026_internal_id);
    }
    for (const id of registryIds) {
      const proposed = rows.some((row) => row.proposed_vs2026_internal_id === id);
      assert.equal(proposed || listed(B10_B11_IDS_ADDED_BEYOND_MATRIX, id), true, id);
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
    for (const datapoint of [...b10Datapoints(), ...b11Datapoints()]) {
      if (datapoint.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
        assert.equal(publishable.has(datapoint.knowledgeHub.url), true, datapoint.id);
        assert.equal(datapoint.knowledgeHub.url.includes("2025-07-30-ec-rec"), false);
      } else {
        assert.equal("url" in datapoint.knowledgeHub, false);
      }
      if (datapoint.xbrl.status === "VERIFIED") {
        assert.equal(verified.has(datapoint.xbrl.qname), true, datapoint.xbrl.qname);
        assert.equal(datapoint.xbrl.qname.includes("|"), false);
      } else {
        assert.equal("qname" in datapoint.xbrl, false);
      }
      if (datapoint.calculation) {
        assert.equal(datapoint.calculation.formula, "NOT_IMPLEMENTED");
        assert.equal(datapoint.calculation.emissionFactors, "NONE");
      }
    }
  });
});
