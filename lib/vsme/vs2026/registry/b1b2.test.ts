import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { getAnnexIIRows } from "../annexII";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";
import {
  APPENDIX_B_TOPIC_FIXTURE,
  B1_B2_IDS_ADDED_BEYOND_MATRIX,
  B1_B2_REQUIRED_STATEMENTS,
  MATRIX_IDS_OUTSIDE_B1_B2,
} from "./b1b2.legal-fixture";
import {
  APPENDIX_B_TOPICS,
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  EXAMINED_OUTSIDE_B1_B2,
  annexIIFor,
  b1b2Datapoints,
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

function readRegistrySources(): string {
  return ["types.ts", "references.ts", "b1.ts", "b2.ts", "index.ts"]
    .map((name) => readFileSync(`${registryDir}${name}`, "utf8"))
    .join("\n");
}

function statements(): string {
  const parts = [
    ...b1b2Datapoints(true).map((datapoint) => datapoint.regulatoryStatement),
    ...(B2_DISCLOSURE.relations ?? []).map((relation) => relation.statement),
  ];
  return parts.join("\n");
}

describe("VS 2026 B1 and B2 registry", () => {
  it("uses the 2026 instrument and keeps one id per datapoint", () => {
    for (const disclosure of [B1_DISCLOSURE, B2_DISCLOSURE]) {
      assert.equal(disclosure.standard, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard);
      assert.equal(disclosure.module, "BASIC");
    }
    const ids = b1b2Datapoints(true).map((datapoint) => datapoint.id);
    const groups = [B1_DISCLOSURE, B2_DISCLOSURE].flatMap((disclosure) =>
      disclosure.repeatingGroups.map((group) => group.id),
    );
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.includes("B1_MODULE_OPTION"), true);
    assert.equal(groups.includes("B1_SUBSIDIARY"), true);
    assert.equal(groups.includes("B1_SITE"), true);
    for (const group of B1_DISCLOSURE.repeatingGroups) {
      assert.equal(group.cardinality, "ZERO_OR_MORE");
      assert.equal(group.maximum, null);
    }
  });

  it("keeps the reporting option on the saved configuration", () => {
    const option = b1b2Datapoints().find((datapoint) => datapoint.id === "B1_MODULE_OPTION");
    assert.ok(option);
    assert.equal(option.role, "DERIVED_FROM_REPORTING_CONFIGURATION");
    assert.deepEqual(option.valueSource, {
      kind: "REPORTING_PERIOD_CONFIGURATION",
      column: "vs2026ReportingOption",
      reader: "getReportingConfiguration",
    });
    assert.equal(option.value.kind, "ENUMERATION");
    if (option.value.kind === "ENUMERATION") {
      assert.deepEqual(
        option.value.members.map((member) => member.id),
        ["OPTION_A", "OPTION_B"],
      );
    }
    const legacyIds = [
      "B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY",
      "B1_MODULE_SELECTION_OPTION_BASIC_AND_COMPREHENSIVE",
    ];
    for (const id of legacyIds) {
      assert.equal(b1b2Datapoints(true).some((datapoint) => datapoint.id === id), false);
    }
    const statement = b1b2Datapoints().find(
      (datapoint) => datapoint.id === "B1_EXPLICIT_COMPLIANCE_STATEMENT",
    );
    assert.equal(statement?.value.kind, "EXPLICIT_STATEMENT");
    if (statement?.value.kind === "EXPLICIT_STATEMENT") {
      assert.equal(statement.value.bindsToDatapointId, "B1_MODULE_OPTION");
    }
  });

  it("represents paragraph 22 omissions apart from applicability and materiality", () => {
    const omitted = b1b2Datapoints().find(
      (datapoint) => datapoint.id === "B1_OMITTED_DISCLOSURES",
    );
    assert.ok(omitted?.omission);
    assert.equal(omitted.requirementType, "IF_APPLICABLE");
    assert.equal(omitted.applicability.kind, "WHEN_PARAGRAPH_22_OMISSION_IS_USED");
    assert.equal(omitted.omission.separateFromApplicabilityState, true);
    assert.equal(omitted.omission.separateFromMateriality, true);
    assert.deepEqual(
      omitted.omission.reasons.map((reason) => reason.point),
      ["22(a)", "22(b)", "22(c)", "22(d)"],
    );
    assert.equal(readRegistrySources().includes("non_material"), false);
  });

  it("resolves B1 Annex II rows from the canonical dataset and leaves B2 unlisted", () => {
    const listed = b1b2Datapoints(true).filter((datapoint) => datapoint.annexII.listed);
    const references = [
      ...new Set(
        listed.map((datapoint) =>
          datapoint.annexII.listed ? datapoint.annexII.reference : "",
        ),
      ),
    ];
    assert.deepEqual(references.sort(), [
      "Para 27, point (a), subpoints (i) and (ii)",
      "Para 27, point (c)",
      "Para 27, point (e), subpoints from (i) to (vii)",
    ]);
    for (const datapoint of listed) {
      assert.equal(annexIIFor(datapoint.annexII, "EMPLOYEES_LE_10").status, "MEMBER");
      assert.equal(annexIIFor(datapoint.annexII, "EMPLOYEES_GT_10").status, "MEMBER");
    }
    for (const datapoint of b1b2Datapoints(true)) {
      if (!datapoint.annexII.listed) {
        assert.equal(annexIIFor(datapoint.annexII, "EMPLOYEES_GT_10").status, "NOT_LISTED");
      }
    }
    assert.equal(getAnnexIIRows().some((row) => row.disclosure === "B2"), false);
    assert.equal(
      b1b2Datapoints().find((datapoint) => datapoint.id === "B1_SUBSIDIARY_NAME")?.annexII
        .listed,
      false,
    );
  });

  it("keeps B2 conditions, Appendix B topics, and open repeating rows", () => {
    assert.deepEqual([...APPENDIX_B_TOPICS], [...APPENDIX_B_TOPIC_FIXTURE]);
    const practices = b1b2Datapoints().find((datapoint) => datapoint.id === "B2_HAS_PRACTICES");
    const published = b1b2Datapoints().find(
      (datapoint) => datapoint.id === "B2_PRACTICE_POLICY_OR_INITIATIVE_IS_PUBLIC",
    );
    assert.equal(practices?.applicability.kind, "WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST");
    assert.equal(practices?.value.kind, "BOOLEAN");
    assert.equal(published?.applicability.kind, "WHEN_POLICIES_EXIST");
    assert.equal(published?.xbrl.status, "VERIFIED");
    const issues = b1b2Datapoints().find(
      (datapoint) => datapoint.id === "B2_SUSTAINABILITY_ISSUES_ADDRESSED",
    );
    assert.equal(issues?.value.kind, "ENUMERATION_SET");
    const guidanceIds = new Set(B2_DISCLOSURE.guidanceDatapoints.map((datapoint) => datapoint.id));
    assert.equal(guidanceIds.size, 3);
    for (const datapoint of b1b2Datapoints()) {
      assert.equal(guidanceIds.has(datapoint.id), false);
      assert.equal(datapoint.role === "PREPARATION_GUIDANCE", false);
    }
    assert.equal(B2_DISCLOSURE.relations?.[0]?.whenReportingOption, "OPTION_B");
    assert.equal(B2_DISCLOSURE.relations?.[0]?.paragraph25Selection, "UNRESOLVED");
    const employees = b1b2Datapoints().find((datapoint) => datapoint.id === "B1_EMPLOYEES");
    assert.equal(employees?.value.kind, "NUMBER");
    assert.equal(
      b1b2Datapoints(true).some((datapoint) => datapoint.id.includes("LATITUDE")),
      false,
    );
  });

  it("matches the Annex I statements and the migration-matrix identities", () => {
    const text = statements();
    for (const statement of B1_B2_REQUIRED_STATEMENTS) {
      assert.equal(text.includes(statement), true, statement);
    }
    const matrix = parseCsv(readFileSync(`${auditDir}vs2026-migration-matrix.csv`, "utf8"));
    const proposed = new Set(
      matrix
        .filter((row) => row.disclosure === "B1" || row.disclosure === "B2")
        .map((row) => row.proposed_vs2026_internal_id),
    );
    const represented = new Set([
      ...b1b2Datapoints(true).map((datapoint) => datapoint.id),
      ...B1_DISCLOSURE.repeatingGroups.map((group) => group.id),
    ]);
    for (const id of proposed) {
      const representedOrExcluded = represented.has(id) || listed(MATRIX_IDS_OUTSIDE_B1_B2, id);
      assert.equal(representedOrExcluded, true, id);
    }
    assert.deepEqual(
      EXAMINED_OUTSIDE_B1_B2.map((item) => item.matrixId),
      [...MATRIX_IDS_OUTSIDE_B1_B2],
    );
    assert.equal(
      represented.has("B1_PREVIOUS_DISCLOSURES_UNCHANGED"),
      false,
    );
    for (const id of represented) {
      const known = proposed.has(id) || listed(B1_B2_IDS_ADDED_BEYOND_MATRIX, id);
      assert.equal(known, true, id);
    }
  });

  it("accepts only audited Knowledge Hub URLs and audited concept QNames", () => {
    const hub = parseCsv(readFileSync(`${auditDir}vs2026-knowledgehub-mapping.csv`, "utf8"));
    const publishable = new Set(
      hub.filter((row) => row.publish_knowledge_hub_url === "YES").map((row) => row.proposed_url),
    );
    const efrag = parseCsv(readFileSync(`${auditDir}vs2026-efrag-mapping.csv`, "utf8"));
    const verifiedConcepts = new Map<string, Set<string>>();
    for (const row of efrag) {
      if (row.verification_status !== "VERIFIED" || !row.efrag_xbrl_concept.startsWith("vs:")) {
        continue;
      }
      const ids = verifiedConcepts.get(row.efrag_xbrl_concept) ?? new Set<string>();
      ids.add(row.internal_datapoint_id);
      verifiedConcepts.set(row.efrag_xbrl_concept, ids);
    }
    for (const datapoint of b1b2Datapoints(true)) {
      if (datapoint.knowledgeHub.status === "VERIFIED_PARAGRAPH") {
        assert.equal(publishable.has(datapoint.knowledgeHub.url), true, datapoint.id);
      } else {
        assert.equal(datapoint.knowledgeHub.legalSourceUrl, VS2026_LEGAL_INSTRUMENTS.voluntaryStandard.eli);
      }
      if (datapoint.xbrl.status === "VERIFIED") {
        const owners = verifiedConcepts.get(datapoint.xbrl.qname);
        assert.ok(owners, datapoint.xbrl.qname);
        const attached =
          owners.has(datapoint.id) ||
          (datapoint.repeatingGroupId !== undefined && owners.has(datapoint.repeatingGroupId));
        assert.equal(attached, true, `${datapoint.id} ${datapoint.xbrl.qname}`);
      } else {
        assert.equal("qname" in datapoint.xbrl, false);
      }
    }
    const source = readRegistrySources();
    assert.equal(source.includes("2025/1710"), false);
    assert.equal(source.includes("2025-07-30-ec-rec"), false);
    assert.equal(source.includes("b1b2.legal-fixture"), false);
    assert.equal(source.includes("employeeCount"), false);
  });
});
