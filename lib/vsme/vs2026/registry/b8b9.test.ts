import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getAnnexIIRows } from "../annexII";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import {
  B8_B9_ANNEX_II_REFERENCES,
  B8_B9_IDS_ADDED_BEYOND_MATRIX,
  B8_COMPLETION_IDS,
  B8_OUTSIDE_COMPLETION_IDS,
  B8_REQUIRED_STATEMENTS,
  B9_COMPLETION_IDS,
  B9_OUTSIDE_COMPLETION_IDS,
  B9_REQUIRED_STATEMENTS,
} from "./b8b9.legal-fixture";
import {
  B8_DISCLOSURE,
  B8_NOT_CARRIED_FORWARD,
  B9_DISCLOSURE,
  annexIIFor,
  b1b2Datapoints,
  b3Datapoints,
  b4Datapoints,
  b5Datapoints,
  b6Datapoints,
  b7Datapoints,
  b8AnnexIDatapoints,
  b8Datapoints,
  b9AnnexIDatapoints,
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
  return [...b8Datapoints(), ...b9Datapoints()].find((datapoint) => datapoint.id === id);
}

describe("VS 2026 B8 and B9 registry", () => {
  it("keeps contract, gender, and country breakdowns distinct", () => {
    assert.equal(B8_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.equal(B8_DISCLOSURE.title, "Workforce – General characteristics");
    assert.deepEqual(
      b8AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B8_COMPLETION_IDS],
    );
    assert.deepEqual(
      b8Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B8_OUTSIDE_COMPLETION_IDS],
    );
    const permanent = byId("B8_EMPLOYEES_PERMANENT");
    const temporary = byId("B8_EMPLOYEES_TEMPORARY");
    assert.equal(permanent?.paragraph, "40(a)");
    assert.equal(temporary?.paragraph, "40(a)");
    assert.equal(permanent?.id === temporary?.id, false);
    assert.equal(permanent?.value.kind, "WORKFORCE_COUNT");
    if (permanent?.value.kind === "WORKFORCE_COUNT" && temporary?.value.kind === "WORKFORCE_COUNT") {
      assert.equal(permanent.value.headcountAndFte, "DO_NOT_ADD");
      assert.equal(permanent.value.silentConversion, "NOT_PERMITTED");
      assert.equal(permanent.value.oneFteEqualsOneEmployee, false);
      assert.equal(permanent.value.distinctFromEmployeeSizeMeasure, "VS2026_EMPLOYEE_PROPORTIONALITY");
      assert.equal(permanent.value.missingCount, "DO_NOT_TREAT_AS_ZERO");
      assert.equal(permanent.value.sharedEnumerationDatapointId, "B1_EMPLOYEE_COUNTING_METHODOLOGY");
      assert.equal(temporary.value.measurementBasisDatapointId, "B8_MEASUREMENT_BASIS");
    }
    const basis = byId("B8_MEASUREMENT_BASIS");
    const b1Basis = b1b2Datapoints().find((datapoint) => datapoint.id === "B1_EMPLOYEE_COUNTING_METHODOLOGY");
    if (basis?.value.kind === "ENUMERATION" && b1Basis?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        basis.value.members.map((member) => member.id),
        b1Basis.value.members.map((member) => member.id),
      );
    }
    assert.equal(basis?.xbrl.status, "UNVERIFIED");
    for (const id of [
      "B8_EMPLOYEES_MALE",
      "B8_EMPLOYEES_FEMALE",
      "B8_EMPLOYEES_OTHER_GENDER",
      "B8_EMPLOYEES_GENDER_NOT_REPORTED",
    ]) {
      assert.equal(byId(id)?.paragraph, "40(b)", id);
      assert.equal(byId(id)?.xbrl.status, "VERIFIED", id);
    }
    const condition = byId("B8_MULTI_COUNTRY_OPERATIONS");
    if (condition?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        condition.value.members.map((member) => member.id),
        ["OPERATES_IN_MORE_THAN_ONE_COUNTRY", "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY"],
      );
    }
    assert.equal(condition?.validationNote?.includes("UNASSESSED is not DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY"), true);
    const countries = B8_DISCLOSURE.repeatingGroups[0];
    assert.equal(countries?.id, "B8_EMPLOYMENT_CONTRACT_COUNTRY");
    assert.equal(countries?.maximum, null);
    assert.equal(countries?.cardinality, "ZERO_OR_MORE");
    assert.equal(byId("B8_EMPLOYEES_BY_COUNTRY")?.applicability.kind, "WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY");
    assert.equal(byId("B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE")?.value.kind, "COUNTRY_CODE");
    assert.equal(listed(B8_NOT_CARRIED_FORWARD, "B8_TURNOVER_EMPLOYEE_TURNOVER_RATE"), true);
    assert.equal(b8Datapoints().some((datapoint) => datapoint.id.includes("TURNOVER")), false);
    assert.equal(b8Datapoints().some((datapoint) => datapoint.paragraph === "58"), false);
  });

  it("keeps accident counts, rates, and one fatality total distinct", () => {
    assert.equal(B9_DISCLOSURE.title, "Workforce – Health and safety");
    assert.deepEqual(
      b9AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B9_COMPLETION_IDS],
    );
    assert.deepEqual(
      b9Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B9_OUTSIDE_COMPLETION_IDS],
    );
    const accidents = byId("B9_RECORDABLE_ACCIDENTS");
    const rate = byId("B9_RECORDABLE_ACCIDENT_RATE");
    assert.equal(accidents?.paragraph, "41(a)");
    assert.equal(rate?.paragraph, "41(a)");
    assert.equal(accidents?.id === rate?.id, false);
    assert.equal(accidents?.value.kind, "COUNT");
    if (accidents?.value.kind === "COUNT") {
      assert.equal(accidents.value.nonNegativeInteger, true);
      assert.equal(accidents.value.reportedZero, "DISTINCT_FROM_MISSING");
      assert.equal(accidents.value.missingCount, "DO_NOT_TREAT_AS_ZERO");
    }
    assert.equal(rate?.value.kind, "ACCIDENT_RATE");
    if (rate?.value.kind === "ACCIDENT_RATE") {
      assert.equal(rate.value.zeroHours, "NOT_A_VALID_RATE");
      assert.equal(rate.value.missingHours, "NOT_A_VALID_RATE");
      assert.equal(rate.value.missingAccidents, "DO_NOT_TREAT_AS_ZERO");
    }
    assert.deepEqual(rate?.calculation?.inputs, [
      "B9_RECORDABLE_ACCIDENTS",
      "B9_HOURS_WORKED",
      "B9_ACCIDENT_RATE_BASIS",
    ]);
    assert.equal(rate?.calculation?.formula, "NOT_IMPLEMENTED");
    const hours = byId("B9_HOURS_WORKED");
    assert.equal(hours?.informationClass, "PREPARATION_DATA");
    assert.equal(hours?.value.kind, "HOURS_WORKED");
    const origin = byId("B9_HOURS_WORKED_ORIGIN");
    if (origin?.value.kind === "ENUMERATION") {
      assert.deepEqual(origin.value.members.map((member) => member.id), ["MEASURED", "ESTIMATED"]);
    }
    const basis = byId("B9_ACCIDENT_RATE_BASIS");
    if (basis?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        basis.value.members.map((member) => member.legalText),
        ["200 000 hours worked", "1 000 000 hours worked"],
      );
      assert.equal(basis.value.members.every((member) => member.xbrlMember === undefined), true);
    }
    const fatalities = byId("B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM");
    assert.equal(fatalities?.informationClass, "REGULATORY_FACT");
    assert.equal(fatalities?.paragraph, "41(b)");
    assert.equal(fatalities?.applicability.kind, "WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED");
    assert.equal(byId("B9_FATALITIES_FROM_ACCIDENTS")?.informationClass, "PREPARATION_DATA");
    assert.equal(byId("B9_FATALITIES_FROM_ILL_HEALTH")?.informationClass, "PREPARATION_DATA");
    assert.equal(b9AnnexIDatapoints().some((datapoint) => datapoint.id === "B9_FATALITIES_FROM_ACCIDENTS"), false);
    assert.equal(fatalities?.calculation?.safeguards?.includes("The two fatality components are not added without a double-counting check."), true);
    assert.equal(byId("B9_FATALITY_LEGAL_RESTRICTION")?.validationNote?.includes("This restriction is not paragraph 22."), true);
    const joined = [...b8Datapoints(), ...b9Datapoints()]
      .flatMap((datapoint) => [datapoint.dataSourceNote ?? "", ...(datapoint.futureValidation ?? [])])
      .join("\n");
    assert.equal(joined.includes("Aggregate counts only."), true);
    assert.equal(joined.includes("medical history"), false);
  });

  it("applies no square-bracket relief and the Annex II rows as listed", () => {
    const canonical = getAnnexIIRows().filter(
      (row) => row.disclosure === "B8" || row.disclosure === "B9",
    );
    assert.deepEqual(
      canonical.map((row) => row.reference),
      [...B8_B9_ANNEX_II_REFERENCES],
    );
    for (const datapoint of [...b8Datapoints(), ...b9Datapoints()]) {
      assert.equal(datapoint.employeeSizeRule.voluntaryForEmployeesLe10, false, datapoint.id);
    }
    for (const id of [
      "B8_EMPLOYEES_PERMANENT",
      "B8_EMPLOYEES_TEMPORARY",
      "B8_EMPLOYEES_MALE",
      "B8_EMPLOYEES_FEMALE",
      "B8_EMPLOYEES_OTHER_GENDER",
      "B8_EMPLOYEES_GENDER_NOT_REPORTED",
      "B9_RECORDABLE_ACCIDENTS",
      "B9_RECORDABLE_ACCIDENT_RATE",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_LE_10").status, "MEMBER", id);
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "MEMBER", id);
    }
    for (const id of [
      "B8_EMPLOYEES_BY_COUNTRY",
      "B8_MEASUREMENT_BASIS",
      "B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM",
      "B9_ACCIDENT_RATE_BASIS",
      "B9_HOURS_WORKED",
    ]) {
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_LE_10").status, "NOT_LISTED", id);
      assert.equal(annexIIFor(byId(id)!.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED", id);
    }
    const source = ["b8.ts", "b9.ts"]
      .map((name) => readFileSync(`${registryDir}${name}`, "utf8"))
      .join("\n");
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b8b9.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("EmployeeTurnoverRate"), false);
    assert.equal(source.includes("voluntaryForEmployeesLe10: true"), false);
    assert.equal(source.includes("medical history"), false);
    assert.equal(/\d+\.\d+/.test(source), false);
  });

  it("matches the legal sentences and the audited mappings", () => {
    const text = [...b8Datapoints(), ...b9Datapoints()]
      .flatMap((datapoint) => [
        datapoint.regulatoryStatement,
        datapoint.validationNote ?? "",
        datapoint.dataSourceNote ?? "",
        ...(datapoint.value.kind === "ENUMERATION"
          ? datapoint.value.members.map((member) => member.legalText)
          : []),
        ...(datapoint.calculation?.safeguards ?? []),
        ...(datapoint.futureValidation ?? []),
      ])
      .join("\n");
    for (const statement of [...B8_REQUIRED_STATEMENTS, ...B9_REQUIRED_STATEMENTS]) {
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
        b9Datapoints().length,
    );
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const rows = matrix.filter((row) => row.disclosure === "B8" || row.disclosure === "B9");
    const registryIds = new Set([...b8Datapoints(), ...b9Datapoints()].map((datapoint) => datapoint.id));
    for (const row of rows) {
      assert.equal(row.employee_size_rule, "NONE", row.proposed_vs2026_internal_id);
      assert.equal(registryIds.has(row.proposed_vs2026_internal_id), true, row.proposed_vs2026_internal_id);
    }
    for (const id of registryIds) {
      const proposed = rows.some((row) => row.proposed_vs2026_internal_id === id);
      assert.equal(proposed || listed(B8_B9_IDS_ADDED_BEYOND_MATRIX, id), true, id);
    }
    assert.equal(registryIds.has(B8_NOT_CARRIED_FORWARD[0]), false);
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
    for (const datapoint of [...b8Datapoints(), ...b9Datapoints()]) {
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
  });
});
