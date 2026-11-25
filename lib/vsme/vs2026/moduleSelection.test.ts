import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  classifyEmployeeSize,
} from "./employeeSize";
import {
  BASIC_DISCLOSURES,
  COMPREHENSIVE_DISCLOSURES,
  disclosureScopeStatus,
  expectsFullComprehensive,
  resolveModuleSelection,
} from "./moduleSelection";

const EMPLOYEE_MEASURES = [8, 10, 11, 500, 1000, 1001];

function optionA(additional: readonly string[] = []) {
  return resolveModuleSelection({
    reportingOption: "OPTION_A",
    additionalComprehensiveDisclosures: additional,
  });
}

function optionB() {
  return resolveModuleSelection({
    reportingOption: "OPTION_B",
  });
}

describe("module selection", () => {
  it("keeps Basic in scope for Option A and Comprehensive out unless selected", () => {
    const result = optionA();
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.resolution.reportingOption, "OPTION_A");
    assert.deepEqual(result.resolution.modules, ["BASIC"]);
    assert.deepEqual(result.resolution.disclosuresInScope, [...BASIC_DISCLOSURES]);
    assert.equal(expectsFullComprehensive(result.resolution), false);
    for (const disclosureId of COMPREHENSIVE_DISCLOSURES) {
      assert.equal(
        disclosureScopeStatus(result.resolution, disclosureId).status,
        "OUT_OF_SCOPE",
      );
    }
    assert.equal(disclosureScopeStatus(result.resolution, "B1").status, "IN_SCOPE");
  });

  it("identifies a selected Comprehensive disclosure without becoming Option B", () => {
    const result = optionA(["C3", "C8"]);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.resolution.reportingOption, "OPTION_A");
    assert.deepEqual(result.resolution.modules, ["BASIC"]);
    assert.equal(expectsFullComprehensive(result.resolution), false);
    assert.deepEqual(result.resolution.additionalComprehensiveDisclosures, ["C3", "C8"]);
    assert.deepEqual(disclosureScopeStatus(result.resolution, "C3"), {
      status: "IN_SCOPE",
      additionalComprehensive: true,
    });
    assert.equal(disclosureScopeStatus(result.resolution, "C1").status, "OUT_OF_SCOPE");
    assert.equal(result.resolution.complianceClaimEligibility, "NOT_EVALUATED");
    assert.equal(result.resolution.completionAssessment, "NOT_EVALUATED");
  });

  it("includes Basic and Comprehensive for Option B and does not declare compliance", () => {
    const result = optionB();
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.deepEqual(result.resolution.modules, ["BASIC", "COMPREHENSIVE"]);
    assert.deepEqual(result.resolution.disclosuresInScope, [
      ...BASIC_DISCLOSURES,
      ...COMPREHENSIVE_DISCLOSURES,
    ]);
    assert.equal(expectsFullComprehensive(result.resolution), true);
    assert.deepEqual(result.resolution.additionalComprehensiveDisclosures, []);
    for (const disclosureId of ["B11", "C1", "C9"]) {
      assert.deepEqual(disclosureScopeStatus(result.resolution, disclosureId), {
        status: "IN_SCOPE",
        additionalComprehensive: false,
      });
    }
    assert.equal(result.resolution.complianceClaimEligibility, "NOT_EVALUATED");
    assert.equal(result.resolution.completionAssessment, "NOT_EVALUATED");
  });

  it("does not change the selected option at any employee measure", () => {
    const baseline = optionA(["C5"]);
    assert.equal(baseline.ok, true);
    for (const employeeMeasure of EMPLOYEE_MEASURES) {
      const category = classifyEmployeeSize({
        reportingPeriodId: "period-2026",
        employeeMeasure,
        measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
      });
      assert.equal(category.ok, true);
      assert.deepEqual(optionA(["C5"]), baseline);
      assert.deepEqual(optionB(), optionB());
    }
    const small = classifyEmployeeSize({
      reportingPeriodId: "period-2026",
      employeeMeasure: 8,
      measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
    });
    const large = classifyEmployeeSize({
      reportingPeriodId: "period-2026",
      employeeMeasure: 1000,
      measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
    });
    assert.equal(small.ok && small.category, "EMPLOYEES_LE_10");
    assert.equal(large.ok && large.category, "EMPLOYEES_GT_10");
    assert.equal(baseline.ok && baseline.resolution.reportingOption, "OPTION_A");
  });

  it("rejects unknown, duplicate, Basic-as-additional, and Option B additions", () => {
    assert.deepEqual(resolveModuleSelection(null), {
      ok: false,
      reason: "MISSING_CONFIGURATION",
    });
    assert.deepEqual(resolveModuleSelection([]), {
      ok: false,
      reason: "MALFORMED_CONFIGURATION",
    });
    assert.deepEqual(
      resolveModuleSelection({ reportingOption: "OPTION_C" }),
      { ok: false, reason: "UNKNOWN_REPORTING_OPTION" },
    );
    assert.deepEqual(optionA(["C99"]), {
      ok: false,
      reason: "UNKNOWN_DISCLOSURE",
    });
    assert.deepEqual(optionA(["B3"]), {
      ok: false,
      reason: "BASIC_DISCLOSURE_NOT_ADDITIONAL",
    });
    assert.deepEqual(optionA(["C1", "C1"]), {
      ok: false,
      reason: "DUPLICATE_DISCLOSURE",
    });
    assert.deepEqual(
      resolveModuleSelection({
        reportingOption: "OPTION_B",
        additionalComprehensiveDisclosures: ["C1"],
      }),
      { ok: false, reason: "ADDITIONAL_DISCLOSURE_NOT_ALLOWED_FOR_OPTION_B" },
    );
    const resolved = optionB();
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(
        disclosureScopeStatus(resolved.resolution, "C10").status,
        "UNKNOWN_DISCLOSURE",
      );
    }
  });

  it("does not read an employee figure or invent a compliance status", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./moduleSelection.ts", import.meta.url)),
      "utf8",
    );
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("500"), false);
    assert.equal(source.includes("COMPLIANT"), false);
  });
});
