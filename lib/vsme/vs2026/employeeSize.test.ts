import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  classifyEmployeeSize,
  type EmployeeSizeInput,
} from "./employeeSize";

function classify(employeeMeasure: number | null | undefined) {
  return classifyEmployeeSize({
    reportingPeriodId: "period-2026",
    employeeMeasure,
    measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  });
}

describe("classifyEmployeeSize", () => {
  it("classifies zero through ten as 10 employees or fewer", () => {
    for (const employeeMeasure of [0, 1, 9, 10]) {
      const result = classify(employeeMeasure);
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.category, "EMPLOYEES_LE_10");
        assert.equal(result.employeeMeasure, employeeMeasure);
        assert.equal(result.reportingPeriodId, "period-2026");
      }
    }
  });

  it("classifies more than ten, including the protected-undertaking boundary, as more than 10", () => {
    for (const employeeMeasure of [11, 999, 1000, 1001]) {
      const result = classify(employeeMeasure);
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.category, "EMPLOYEES_GT_10");
      }
    }
    const atProtectedBoundary = classify(1000);
    const aboveProtectedBoundary = classify(1001);
    const justAboveTen = classify(11);
    assert.equal(atProtectedBoundary.ok && atProtectedBoundary.category, "EMPLOYEES_GT_10");
    assert.equal(
      aboveProtectedBoundary.ok && aboveProtectedBoundary.category,
      justAboveTen.ok && justAboveTen.category,
    );
  });

  it("rejects a missing measure, a negative measure, and a non-finite measure", () => {
    assert.deepEqual(classify(null), {
      ok: false,
      reason: "MISSING_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(undefined), {
      ok: false,
      reason: "MISSING_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(-1), {
      ok: false,
      reason: "NEGATIVE_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(-0.5), {
      ok: false,
      reason: "NEGATIVE_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(Number.NaN), {
      ok: false,
      reason: "NON_FINITE_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(Number.POSITIVE_INFINITY), {
      ok: false,
      reason: "NON_FINITE_EMPLOYEE_MEASURE",
    });
    assert.deepEqual(classify(Number.NEGATIVE_INFINITY), {
      ok: false,
      reason: "NON_FINITE_EMPLOYEE_MEASURE",
    });
  });

  it("rejects a missing reporting period and a measure that was not explicitly identified", () => {
    assert.deepEqual(
      classifyEmployeeSize({
        reportingPeriodId: "  ",
        employeeMeasure: 10,
        measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
      }),
      { ok: false, reason: "MISSING_REPORTING_PERIOD" },
    );

    const companyCount: EmployeeSizeInput = {
      reportingPeriodId: "period-2026",
      employeeMeasure: 10,
      measureKind: "COMPANY_EMPLOYEE_COUNT",
    };
    assert.deepEqual(classifyEmployeeSize(companyCount), {
      ok: false,
      reason: "MEASURE_NOT_EXPLICIT",
    });
    assert.equal(
      classifyEmployeeSize({
        reportingPeriodId: "period-2026",
        employeeMeasure: 650,
        measureKind: "COMPREHENSIVE_EMPLOYEE_THRESHOLD",
      }).ok,
      false,
    );
  });

  it("does not mention the stored company count or the retired thresholds", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./employeeSize.ts", import.meta.url)),
      "utf8",
    );
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("500"), false);
    assert.equal(source.includes("1000"), false);
  });
});
