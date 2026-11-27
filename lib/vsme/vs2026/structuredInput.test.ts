import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ISO_3166_ALPHA2, isIso3166Alpha2 } from "./iso3166Alpha2";
import { registryDatapoint } from "./scalarEligibility";
import { classifyCoverage } from "./repeatingForm";
import {
  omissionWorkflowStatus,
  validateCountryCode,
  validateGeolocation,
  validateLegalForm,
  validateNaceCodes,
  validatePublicUrl,
} from "./structuredInput";
import { validateScalarWrite as writeScalar } from "./scalarEligibility";

function datapoint(id: string) {
  const found = registryDatapoint(id);
  assert.ok(found, id);
  return found;
}

describe("VS 2026 structured inputs", () => {
  it("accepts a country-specific legal form and rejects a blank-only value as a clear", () => {
    assert.deepEqual(validateLegalForm("  Aktiebolag  "), { ok: true, value: "Aktiebolag" });
    assert.deepEqual(validateLegalForm("Gesellschaft mit beschränkter Haftung"), {
      ok: true,
      value: "Gesellschaft mit beschränkter Haftung",
    });
    assert.deepEqual(validateLegalForm("   "), { ok: true, value: null });
    assert.equal(validateLegalForm("x".repeat(301)).ok, false);
    assert.equal(writeScalar(datapoint("B1_LEGAL_FORM"), "Aktiebolag").ok, true);
    assert.equal(writeScalar(datapoint("B1_EXPLICIT_COMPLIANCE_STATEMENT"), "COMPLIANT").ok, false);
  });

  it("stores distinct NACE codes as JSON and rejects malformed lists", () => {
    assert.deepEqual(validateNaceCodes('["01.11","10.20"]'), { ok: true, value: '["01.11","10.20"]' });
    assert.equal(validateNaceCodes("01.11,10.20").ok, false);
    assert.equal(validateNaceCodes('["1.1"]').ok, false);
    assert.equal(validateNaceCodes('["01.11","01.11"]').ok, false);
    assert.equal(validateNaceCodes("[]").ok, false);
    assert.equal(validateNaceCodes('["00"]').ok, false);
    assert.deepEqual(validateNaceCodes(""), { ok: true, value: null });
  });

  it("accepts assigned country codes and a point, and rejects names, polygons, and out-of-range coordinates", () => {
    assert.equal(ISO_3166_ALPHA2.length, 249);
    assert.equal(isIso3166Alpha2("SE"), true);
    assert.equal(isIso3166Alpha2("UK"), false);
    assert.equal(isIso3166Alpha2("EU"), false);
    assert.deepEqual(validateCountryCode("se"), { ok: true, value: "SE" });
    assert.equal(validateCountryCode("Sweden").ok, false);
    assert.deepEqual(validateGeolocation("59.3293,18.0686"), { ok: true, value: "59.3293,18.0686" });
    assert.deepEqual(validateGeolocation("18.10,59.30"), { ok: true, value: "18.10,59.30" });
    assert.equal(validateGeolocation("91,18").ok, false);
    assert.equal(validateGeolocation("59,181").ok, false);
    assert.equal(validateGeolocation("59,18,0").ok, false);
    assert.equal(validateGeolocation("59").ok, false);
    assert.deepEqual(validateGeolocation(""), { ok: true, value: null });
  });

  it("stores an http(s) URL exactly and does not accept other protocols or credentials", () => {
    const exact = "https://example.com/pollution";
    assert.deepEqual(validatePublicUrl(`  ${exact}  `), { ok: true, value: exact });
    assert.equal(validatePublicUrl("javascript:alert(1)").ok, false);
    assert.equal(validatePublicUrl("file:///etc/passwd").ok, false);
    assert.equal(validatePublicUrl("ftp://example.com/report").ok, false);
    assert.equal(validatePublicUrl("https://user:pass@example.com/report").ok, false);
    assert.equal(validatePublicUrl("https://example.com/a b").ok, false);
  });

  it("keeps the legal waste proportion editable and the digital percentages out of the editor", () => {
    assert.equal(writeScalar(datapoint("B7_WASTE_DIVERTED_PROPORTION"), "12.5").ok, true);
    assert.equal(writeScalar(datapoint("B7_WASTE_DIVERTED_PROPORTION"), "0").ok, true);
    assert.equal(writeScalar(datapoint("B7_WASTE_RECYCLING_PERCENT_MASS"), "10").ok, false);
    assert.equal(writeScalar(datapoint("B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS"), "10").ok, false);
    assert.equal(classifyCoverage(datapoint("B7_WASTE_RECYCLING_PERCENT_MASS")), "DIGITAL_ONLY");
    assert.equal(classifyCoverage(datapoint("B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS")), "DIGITAL_ONLY");
  });

  it("accepts the verified B8, B9, B10, and B11 members and leaves an empty value unanswered", () => {
    const accepted: [string, string][] = [
      ["B8_MULTI_COUNTRY_OPERATIONS", "OPERATES_IN_MORE_THAN_ONE_COUNTRY"],
      ["B8_MULTI_COUNTRY_OPERATIONS", "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY"],
      ["B9_HOURS_WORKED_ORIGIN", "MEASURED"],
      ["B9_HOURS_WORKED_ORIGIN", "ESTIMATED"],
      ["B9_ACCIDENT_RATE_BASIS", "BASIS_200000_HOURS"],
      ["B9_ACCIDENT_RATE_BASIS", "BASIS_1000000_HOURS"],
      ["B9_FATALITY_LEGAL_RESTRICTION", "NO_RESTRICTION_IDENTIFIED"],
      ["B9_FATALITY_LEGAL_RESTRICTION", "RESTRICTION_AFFECTS_DISCLOSURE"],
      ["B10_MINIMUM_WAGE_DETERMINATION", "STATUTORY_MINIMUM_WAGE"],
      ["B10_MINIMUM_WAGE_DETERMINATION", "COLLECTIVELY_AGREED_MINIMUM_REMUNERATION"],
      ["B10_MINIMUM_WAGE_DETERMINATION", "NO_APPLICABLE_MINIMUM_IDENTIFIED"],
      ["B10_MINIMUM_WAGE_DETERMINATION", "DETERMINATION_UNRESOLVED"],
      ["B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", "YES"],
      ["B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", "NO"],
      ["B10_GENDER_PAY_GAP_LEGAL_OBLIGATION", "LEGALLY_REQUIRED_TO_REPORT"],
      ["B10_GENDER_PAY_GAP_LEGAL_OBLIGATION", "NO_IDENTIFIED_REPORTING_REQUIREMENT"],
      ["B11_CONVICTIONS_AND_FINES_ASSESSMENT", "CONVICTIONS_OCCURRED"],
      ["B11_CONVICTIONS_AND_FINES_ASSESSMENT", "FINES_OCCURRED"],
      ["B11_CONVICTIONS_AND_FINES_ASSESSMENT", "BOTH_OCCURRED"],
      ["B11_CONVICTIONS_AND_FINES_ASSESSMENT", "NEITHER_AFTER_ASSESSMENT"],
    ];
    for (const [id, member] of accepted) {
      const result = writeScalar(datapoint(id), member);
      assert.equal(result.ok, true, `${id} ${member}`);
    }
    for (const id of [
      "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE",
      "B11_CONVICTIONS_AND_FINES_ASSESSMENT",
      "B8_MULTI_COUNTRY_OPERATIONS",
    ]) {
      const cleared = writeScalar(datapoint(id), "");
      assert.equal(cleared.ok, true);
      if (cleared.ok) {
        assert.equal(cleared.value, null);
      }
      assert.equal(writeScalar(datapoint(id), "UNASSESSED").ok, false);
    }
  });

  it("derives omission workflow status without a legal-approval label", () => {
    assert.equal(omissionWorkflowStatus({ conditionsAssessed: false, reassessedForPeriod: false }), "DRAFT");
    assert.equal(omissionWorkflowStatus({ conditionsAssessed: true, reassessedForPeriod: false }), "REASSESSMENT_REQUIRED");
    assert.equal(omissionWorkflowStatus({ conditionsAssessed: false, reassessedForPeriod: true }), "INCOMPLETE");
    assert.equal(omissionWorkflowStatus({ conditionsAssessed: true, reassessedForPeriod: true }), "STRUCTURALLY_COMPLETE");
    assert.equal(JSON.stringify(omissionWorkflowStatus({ conditionsAssessed: true, reassessedForPeriod: true })).includes("LEGALLY_APPROVED"), false);
  });
});
