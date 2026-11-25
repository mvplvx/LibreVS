import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getAnnexIIRows } from "../annexII";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import { B1_DISCLOSURE } from "./b1";
import {
  B4_B5_IDS_ADDED_BEYOND_MATRIX,
  B4_B5_REMOVED_LEGACY_IDS,
  B4_COMPLETION_IDS,
  B4_OUTSIDE_COMPLETION_IDS,
  B4_REQUIRED_STATEMENTS,
  B5_COMPLETION_IDS,
  B5_OUTSIDE_COMPLETION_IDS,
  B5_REQUIRED_STATEMENTS,
} from "./b4b5.legal-fixture";
import {
  B4_DISCLOSURE,
  B4_FOLDED_PROPOSED_IDS,
  B4_NOT_CARRIED_FORWARD,
  B5_DISCLOSURE,
  B5_FOLDED_PROPOSED_IDS,
  B5_NOT_CARRIED_FORWARD,
  annexIIFor,
  b1b2Datapoints,
  b3Datapoints,
  b4AnnexIDatapoints,
  b4Datapoints,
  b5AnnexIDatapoints,
  b5Datapoints,
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
  return [...b4Datapoints(), ...b5Datapoints()].find((datapoint) => datapoint.id === id);
}

describe("VS 2026 B4 and B5 registry", () => {
  it("represents paragraph 34 as a conditional disclosure with two methods", () => {
    assert.equal(B4_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.equal(B4_DISCLOSURE.paragraphs[0], "34");
    const ids = b4Datapoints().map((datapoint) => datapoint.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      b4AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B4_COMPLETION_IDS],
    );
    const condition = byId("B4_REPORTING_CONDITION");
    assert.equal(condition?.informationClass, "PREPARATION_DATA");
    assert.equal(condition?.applicability.kind, "ALWAYS");
    assert.equal(condition?.value.kind, "ENUMERATION");
    if (condition?.value.kind === "ENUMERATION") {
      const members = condition.value.members.map((member) => member.id);
      assert.deepEqual(members, [
        "LEGAL_REPORTING_REQUIREMENT",
        "EMS_VOLUNTARY_REPORTING",
        "BOTH",
        "NEITHER",
      ]);
    }
    assert.equal(condition?.validationNote?.includes("UNASSESSED is not NEITHER"), true);
    assert.equal(condition?.validationNote?.includes("not zero"), true);
    const method = byId("B4_DISCLOSURE_METHOD");
    assert.equal(method?.applicability.kind, "WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES");
    assert.equal(method?.informationClass, "PREPARATION_DATA");
    const url = byId("B4_PUBLIC_DISCLOSURE_URL");
    assert.equal(url?.applicability.kind, "WHEN_PUBLIC_DOCUMENT_REFERENCE_IS_SELECTED");
    assert.equal(url?.value.kind, "USER_DOCUMENT_REFERENCE");
    assert.equal(url?.informationClass, "REGULATORY_FACT");
    if (url?.value.kind === "USER_DOCUMENT_REFERENCE") {
      assert.equal(url.value.missingReference, "NOT_A_VALID_PUBLIC_REFERENCE");
      assert.equal(url.value.arbitraryUrl, "NOT_SUFFICIENT");
      assert.equal(url.value.externalFetch, "NOT_IMPLEMENTED");
      assert.equal(url.value.distinctFrom.includes("KNOWLEDGE_HUB_PARAGRAPH_URL"), true);
    }
    assert.equal(url?.knowledgeHub.status, "VERIFIED_PARAGRAPH");
    if (url?.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
      assert.equal(url.knowledgeHub.url.includes("knowledgehub.efrag.org"), true);
      assert.equal(JSON.stringify(url.value).includes("knowledgehub.efrag.org"), false);
    }
    assert.equal(url?.paragraph, "34");
    const group = B4_DISCLOSURE.repeatingGroups[0];
    assert.equal(group?.id, "B4_POLLUTANT");
    assert.equal(group?.cardinality, "ZERO_OR_MORE");
    assert.equal(group?.maximum, null);
    const media = b4Datapoints()
      .filter((datapoint) => datapoint.value.kind === "REPEATING_DIMENSIONED_QUANTITY")
      .map((datapoint) =>
        datapoint.value.kind === "REPEATING_DIMENSIONED_QUANTITY"
          ? datapoint.value.environmentalMedium
          : "",
      );
    assert.deepEqual(media, ["AIR", "WATER", "SOIL"]);
    for (const datapoint of b4Datapoints()) {
      if (datapoint.value.kind === "REPEATING_DIMENSIONED_QUANTITY") {
        assert.equal(datapoint.value.maximum, null);
        assert.equal(datapoint.value.missingQuantity, "DO_NOT_TREAT_AS_ZERO");
        assert.equal(datapoint.value.aggregation, "DO_NOT_AGGREGATE_INCOMPATIBLE_UNITS");
        assert.equal(datapoint.value.reportedUnit, "MASS_AS_REPORTED");
        assert.equal(datapoint.applicability.kind, "WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED");
      }
    }
    assert.deepEqual(
      b4Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B4_OUTSIDE_COMPLETION_IDS],
    );
  });

  it("represents paragraph 35 as site references and open biodiversity relationships", () => {
    assert.equal(B5_DISCLOSURE.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
    assert.equal(B5_DISCLOSURE.paragraphs.includes("35"), true);
    const ids = b5Datapoints().map((datapoint) => datapoint.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      b5AnnexIDatapoints().map((datapoint) => datapoint.id),
      [...B5_COMPLETION_IDS],
    );
    const siteGroup = B1_DISCLOSURE.repeatingGroups.find((group) => group.id === "B1_SITE");
    assert.equal(siteGroup?.maximum, null);
    for (const group of B5_DISCLOSURE.repeatingGroups) {
      assert.equal(group.cardinality, "ZERO_OR_MORE");
      assert.equal(group.maximum, null);
      assert.equal(group.siteInventory, "B1_SITE");
    }
    const relationships = B5_DISCLOSURE.repeatingGroups.find(
      (group) => group.id === "B5_SITE_BSA_RELATIONSHIP",
    );
    assert.equal(relationships?.relationshipsPerSite, "ZERO_OR_MORE");
    assert.equal(
      relationships?.applicability.kind,
      "WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA",
    );
    for (const id of ["B5_RELATIONSHIP_SITE_REFERENCE", "B5_ASSESSED_SITE_REFERENCE"]) {
      const datapoint = byId(id);
      assert.equal(datapoint?.value.kind, "SITE_REFERENCE");
      if (datapoint?.value.kind === "SITE_REFERENCE") {
        assert.equal(datapoint.value.inventory, "B1_SITE");
        assert.equal(datapoint.value.identifierDatapointId, "B1_SITE_IDENTIFIER");
        assert.equal(datapoint.value.createsSecondInventory, false);
      }
    }
    const relationship = byId("B5_BSA_RELATIONSHIP");
    assert.equal(relationship?.informationClass, "REGULATORY_FACT");
    if (relationship?.value.kind === "ENUMERATION") {
      assert.deepEqual(
        relationship.value.members.map((member) => member.id),
        ["LOCATED_IN", "NEAR_OVERLAPPING_OR_ADJACENT"],
      );
    }
    const assessment = byId("B5_SITE_BSA_ASSESSMENT");
    assert.equal(assessment?.informationClass, "PREPARATION_DATA");
    assert.equal(
      assessment?.validationNote?.includes(
        "A missing relationship row is not an assessed absence of a biodiversity-sensitive area.",
      ),
      true,
    );
    assert.equal(assessment?.validationNote?.includes("UNASSESSED is not NO_IDENTIFIED_RELATIONSHIP"), true);
    const influence = byId("B5_AREA_OF_INFLUENCE_DETERMINATION");
    assert.equal(influence?.informationClass, "SUPPLEMENTARY");
    assert.equal(influence?.requirementType, "VOLUNTARY");
    assert.equal(influence?.applicability.kind, "WHEN_SITE_IS_OUTSIDE_AND_NOT_ADJACENT");
    assert.equal(b5AnnexIDatapoints().some((datapoint) => datapoint.id === influence?.id), false);
    assert.deepEqual(
      b5Datapoints()
        .filter((datapoint) => datapoint.informationClass !== "REGULATORY_FACT")
        .map((datapoint) => datapoint.id),
      [...B5_OUTSIDE_COMPLETION_IDS],
    );
  });

  it("applies no employee-size relief and no Annex II membership", () => {
    const rows = getAnnexIIRows();
    assert.equal(rows.some((row) => row.disclosure === "B4" || row.disclosure === "B5"), false);
    for (const datapoint of [...b4Datapoints(), ...b5Datapoints()]) {
      assert.equal(datapoint.employeeSizeRule.voluntaryForEmployeesLe10, false);
      assert.equal(datapoint.annexII.listed, false);
      assert.equal(annexIIFor(datapoint.annexII, "EMPLOYEES_LE_10").status, "NOT_LISTED");
      assert.equal(annexIIFor(datapoint.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED");
      assert.equal(datapoint.calculation, undefined);
    }
    const source = ["b4.ts", "b5.ts"]
      .map((name) => readFileSync(`${registryDir}${name}`, "utf8"))
      .join("\n");
    assert.equal(source.includes("voluntaryForEmployeesLe10: true"), false);
    assert.equal(source.includes("radius"), false);
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b4b5.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(/\d+\.\d+/.test(source), false);
  });

  it("matches the legal statements and the audited mappings", () => {
    const text = [...b4Datapoints(), ...b5Datapoints()]
      .flatMap((datapoint) => [
        datapoint.regulatoryStatement,
        datapoint.validationNote ?? "",
        ...(datapoint.futureValidation ?? []),
      ])
      .join("\n");
    for (const statement of [...B4_REQUIRED_STATEMENTS, ...B5_REQUIRED_STATEMENTS]) {
      assert.equal(text.includes(statement), true, statement);
    }
    const known = new Set([
      ...b1b2Datapoints(true).map((datapoint) => datapoint.id),
      ...b3Datapoints().map((datapoint) => datapoint.id),
      ...b4Datapoints().map((datapoint) => datapoint.id),
      ...b5Datapoints().map((datapoint) => datapoint.id),
    ]);
    assert.equal(known.size, b1b2Datapoints(true).length + b3Datapoints().length + b4Datapoints().length + b5Datapoints().length);
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const rows = matrix.filter((row) => row.disclosure === "B4" || row.disclosure === "B5");
    const removed = rows
      .filter((row) => row.change_class === "REMOVED")
      .map((row) => row.existing_librevs_id);
    assert.deepEqual(removed.sort(), [...B4_B5_REMOVED_LEGACY_IDS].sort());
    assert.deepEqual(
      [...B4_NOT_CARRIED_FORWARD, ...B5_NOT_CARRIED_FORWARD].map((item) => item.legacyId).sort(),
      [...B4_B5_REMOVED_LEGACY_IDS].sort(),
    );
    const registryIds = new Set([...b4Datapoints(), ...b5Datapoints()].map((datapoint) => datapoint.id));
    for (const row of rows) {
      assert.equal(row.employee_size_rule, "NONE", row.existing_librevs_id);
      const proposed = row.proposed_vs2026_internal_id;
      if (row.change_class === "REMOVED" || proposed === "") {
        assert.equal(registryIds.has(row.existing_librevs_id), false);
        continue;
      }
      assert.equal(row.annex_ii_le_10, "NOT_LISTED", row.existing_librevs_id);
      assert.equal(row.annex_ii_gt_10, "NOT_LISTED", row.existing_librevs_id);
      const accounted =
        registryIds.has(proposed) ||
        listed(B4_FOLDED_PROPOSED_IDS, proposed) ||
        listed(B5_FOLDED_PROPOSED_IDS, proposed);
      assert.equal(accounted, true, proposed);
    }
    for (const id of registryIds) {
      const proposed = rows.some((row) => row.proposed_vs2026_internal_id === id);
      assert.equal(proposed || listed(B4_B5_IDS_ADDED_BEYOND_MATRIX, id), true, id);
    }
    for (const legacyId of removed) {
      assert.equal(registryIds.has(legacyId), false);
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
    for (const datapoint of [...b4Datapoints(), ...b5Datapoints()]) {
      if (datapoint.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
        assert.equal(publishable.has(datapoint.knowledgeHub.url), true, datapoint.id);
        assert.equal(datapoint.knowledgeHub.url.includes("2025-07-30-ec-rec"), false);
      } else {
        assert.equal(datapoint.knowledgeHub.legalSourceUrl, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard.eli);
        assert.equal("url" in datapoint.knowledgeHub, false);
      }
      if (datapoint.xbrl.status === "VERIFIED") {
        assert.equal(verified.has(datapoint.xbrl.qname), true, datapoint.xbrl.qname);
      } else {
        assert.equal("qname" in datapoint.xbrl, false);
      }
    }
    const verifiedB4 = b4Datapoints().filter((datapoint) => datapoint.xbrl.status === "VERIFIED");
    assert.deepEqual(
      verifiedB4.map((datapoint) => (datapoint.xbrl.status === "VERIFIED" ? datapoint.xbrl.qname : "")),
      [
        "vs:PubliclyAvailableDisclosure",
        "vs:URLOrLinkToThePubliclyAvailableDisclosure",
        "vs:AmountOfEmissionToAir",
        "vs:AmountOfEmissionToWater",
        "vs:AmountOfEmissionToSoil",
      ],
    );
    const verifiedB5 = b5Datapoints().filter((datapoint) => datapoint.xbrl.status === "VERIFIED");
    assert.deepEqual(
      verifiedB5.map((datapoint) => (datapoint.xbrl.status === "VERIFIED" ? datapoint.xbrl.qname : "")),
      ["vs:NameOfBiodiversitySensitiveArea"],
    );
  });
});
