import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { VSME_FIELD_IDS } from "../vsme.fieldRegistry";
import { disclosureDatapoints } from "./registry";
import {
  LEGACY_COLLIDING_DATAPOINT_IDS,
  classifyDatapoint,
  editorDisclosures,
  validateScalarWrite,
} from "./scalarEligibility";

describe("VS 2026 scalar eligibility", () => {
  it("edits only verified scalar shapes and blocks every legacy identifier collision", () => {
    const legacy = new Set<string>(VSME_FIELD_IDS);
    const overlap = editorDisclosures()
      .flatMap((disclosure) => disclosureDatapoints(disclosure, true).map((datapoint) => datapoint.id))
      .filter((id) => legacy.has(id))
      .sort();
    assert.deepEqual([...LEGACY_COLLIDING_DATAPOINT_IDS].sort(), overlap);

    const reasons = new Map<string, string[]>();
    const controls = new Map<string, number>();
    let editable = 0;
    for (const disclosure of editorDisclosures()) {
      let editableInDisclosure = 0;
      for (const datapoint of disclosureDatapoints(disclosure, true)) {
        const decision = classifyDatapoint(datapoint);
        if (decision.editable) {
          editable += 1;
          editableInDisclosure += 1;
          controls.set(decision.control.kind, (controls.get(decision.control.kind) ?? 0) + 1);
        } else {
          const ids = reasons.get(decision.reason) ?? [];
          ids.push(datapoint.id);
          reasons.set(decision.reason, ids);
        }
      }
      assert.equal(editableInDisclosure > 0, true, disclosure.id);
    }

    assert.equal(editable, 72);
    assert.equal(reasons.get("DERIVED")?.join(), "B1_MODULE_OPTION");
    assert.equal(reasons.get("CALCULATED")?.join(), "B3_SCOPE1_SCOPE2_LOCATION_TOTAL");
    assert.equal(reasons.get("LEGACY_IDENTIFIER_COLLISION")?.length, 3);
    assert.equal(reasons.get("DIGITAL_ONLY")?.length, 3);
    assert.equal(reasons.get("REPEATING_OR_DIMENSIONED")?.length, 30);
    assert.deepEqual(reasons.get("UNSAFE_VALUE_SHAPE"), [
      "B1_EXPLICIT_COMPLIANCE_STATEMENT",
      "B2_SUSTAINABILITY_ISSUES_ADDRESSED",
    ]);
    assert.equal(controls.get("boolean"), 6);
    assert.equal(controls.get("enumeration"), 17);
    assert.equal(controls.get("legalForm"), 1);
    assert.equal(controls.get("naceCodes"), 1);
    assert.equal(controls.get("url"), 1);
    assert.equal(controls.get("monetary"), 5);
    assert.equal(controls.get("narrative"), 4);
    assert.equal(controls.get("text"), 1);
    assert.equal(controls.get("number"), 33);
    assert.equal(controls.get("percentage"), 3);

    const practices = editorDisclosures()
      .flatMap((disclosure) => disclosureDatapoints(disclosure, true))
      .find((datapoint) => datapoint.id === "B2_HAS_PRACTICES");
    assert.ok(practices);
    assert.deepEqual(validateScalarWrite(practices, "false"), { ok: true, value: "false", unit: null });
    const clearedPractice = validateScalarWrite(practices, "");
    assert.equal(clearedPractice.ok, true);
    if (clearedPractice.ok) {
      assert.equal(clearedPractice.value, null);
    }
    assert.equal(validateScalarWrite(practices, "yes").ok, false);

    const energy = editorDisclosures()
      .flatMap((disclosure) => disclosureDatapoints(disclosure, true))
      .find((datapoint) => datapoint.id === "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.ok(energy);
    assert.deepEqual(validateScalarWrite(energy, "0"), { ok: true, value: "0", unit: "MWh" });
    const clearedEnergy = validateScalarWrite(energy, "");
    assert.equal(clearedEnergy.ok, true);
    if (clearedEnergy.ok) {
      assert.equal(clearedEnergy.value, null);
    }

    const basis = editorDisclosures()
      .flatMap((disclosure) => disclosureDatapoints(disclosure, true))
      .find((datapoint) => datapoint.id === "B1_REPORTING_BASIS");
    assert.ok(basis);
    assert.equal(validateScalarWrite(basis, "INDIVIDUAL").ok, true);
    assert.equal(validateScalarWrite(basis, "individual basis").ok, false);

    const derived = editorDisclosures()
      .flatMap((disclosure) => disclosureDatapoints(disclosure, true))
      .find((datapoint) => datapoint.id === "B1_MODULE_OPTION");
    assert.ok(derived);
    const derivedWrite = validateScalarWrite(derived, "OPTION_A");
    assert.equal(derivedWrite.ok, false);
    if (!derivedWrite.ok) {
      assert.equal(derivedWrite.code, "NOT_EDITABLE");
    }
  });
});

describe("VS 2026 editor boundary", () => {
  it("does not trust client identity headers or enable itself from the preview flag", () => {
    const files = [
      new URL("./editorWrite.ts", import.meta.url),
      new URL("./editorLoad.ts", import.meta.url),
      new URL("./editorActions.ts", import.meta.url),
      new URL("./repeatingWrite.ts", import.meta.url),
      new URL("./repeatingForm.ts", import.meta.url),
      new URL("../../../components/vsme/vs2026/RepeatingGroups.tsx", import.meta.url),
      new URL("./editorAvailability.ts", import.meta.url),
      new URL("./reportingState.ts", import.meta.url),
      new URL("../../../app/vsme/vs2026/edit/[reportingPeriodId]/page.tsx", import.meta.url),
      new URL("../../../components/vsme/vs2026/Vs2026Editor.tsx", import.meta.url),
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.equal(source.includes("x-user-id"), false, file.pathname);
      assert.equal(source.includes("x-organization-id"), false, file.pathname);
      assert.equal(source.includes("getUser"), false, file.pathname);
      assert.equal(source.includes("employeeCount"), false, file.pathname);
      assert.equal(source.includes("moduleScope"), false, file.pathname);
      assert.equal(source.includes("VS2026_PREVIEW_ENABLED"), false, file.pathname);
    }
    const route = readFileSync(
      new URL("../../../app/api/vsme/release/readiness/route.ts", import.meta.url),
      "utf8",
    );
    assert.equal(route.includes("runReadinessCheckForOrganization"), true);
    assert.equal(route.includes("runReadinessCheck("), false);
    const page = readFileSync(
      new URL("../../../app/vsme/vs2026/edit/[reportingPeriodId]/page.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(page.includes("loadVs2026Editor"), true);
    const chrome = readFileSync(new URL("../../../components/vsme/LibreVsChrome.tsx", import.meta.url), "utf8");
    assert.equal(chrome.includes("/vsme/vs2026"), false);
  });
});
