import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { evaluateVS2026ReportingState, type DatapointEvaluation, type ReportEvaluation } from "./evaluation";
import { resolveModuleSelection } from "./moduleSelection";
import type { StoredReportingConfiguration } from "./reportingConfiguration";
import {
  mapPersistedReportingSnapshot,
  type PersistedReportingSnapshot,
  type PersistedRepeatingRow,
} from "./reportingDataLoader";

const SOURCE = readFileSync(new URL("./reportingDataLoader.ts", import.meta.url), "utf8");

function configured(
  reportingOption: "OPTION_A" | "OPTION_B" = "OPTION_A",
  additional: readonly string[] = ["C5"],
): StoredReportingConfiguration {
  const selected = resolveModuleSelection({
    reportingOption,
    additionalComprehensiveDisclosures: additional,
  });
  assert.equal(selected.ok, true);
  if (!selected.ok || selected.resolution.reportingOption !== reportingOption) {
    throw new Error("configuration");
  }
  return {
    status: "CONFIGURED",
    reportingPeriodId: "period-1",
    reportingOption,
    additionalComprehensiveDisclosures: selected.resolution.additionalComprehensiveDisclosures,
    resolution: selected.resolution,
  };
}

function row(partial: PersistedRepeatingRow): PersistedRepeatingRow {
  return partial;
}

function snapshot(
  overrides: Partial<PersistedReportingSnapshot> = {},
): PersistedReportingSnapshot {
  return {
    reportingPeriodId: "period-1",
    configuration: configured(),
    scalars: [],
    rows: [],
    ...overrides,
  };
}

describe("VS 2026 reporting data mapping", () => {
  it("keeps zero, false, and missing distinct and derives the saved option", () => {
    const loaded = mapPersistedReportingSnapshot(
      snapshot({
        scalars: [
          { fieldId: "B1_TURNOVER", value: "0" },
          { fieldId: "B4_PUBLIC_DISCLOSURE_FLAG", value: "false" },
          { fieldId: "B1_MODULE_OPTION", value: "OPTION_A" },
          { fieldId: "B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY", value: "true" },
          { fieldId: "B1_EMPLOYEES", value: "600" },
        ],
      }),
    );
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }
    assert.equal(loaded.loaded.input.employeeSize.status, "NOT_PROVIDED");
    assert.equal(loaded.loaded.input.configuration.status, "CONFIGURED");
    if (loaded.loaded.input.configuration.status !== "CONFIGURED") {
      return;
    }
    assert.equal(loaded.loaded.input.configuration.reportingOption, "OPTION_A");
    assert.deepEqual(loaded.loaded.input.configuration.additionalComprehensiveDisclosures, ["C5"]);
    assert.deepEqual(loaded.loaded.excludedFieldIds, [
      "B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY",
    ]);
    const facts = loaded.loaded.input.facts ?? [];
    assert.equal(facts.some((fact) => fact.datapointId === "B1_MODULE_OPTION"), false);
    assert.equal(facts.some((fact) => fact.datapointId === "B1_BALANCE_SHEET_TOTAL"), false);
    const report = evaluateVS2026ReportingState(loaded.loaded.input);
    const turnover = report.datapoints.find((item) => item.datapointId === "B1_TURNOVER");
    const flag = report.datapoints.find((item) => item.datapointId === "B4_PUBLIC_DISCLOSURE_FLAG");
    const balance = report.datapoints.find((item) => item.datapointId === "B1_BALANCE_SHEET_TOTAL");
    const option = report.datapoints.find((item) => item.datapointId === "B1_MODULE_OPTION");
    assert.equal(report.reportingOption, "OPTION_A");
    assert.equal(report.employeeCategory, null);
    assert.equal(turnover?.valueStatus, "REPORTED_ZERO");
    assert.equal(turnover?.recordedValue, "0");
    assert.equal(flag?.valueStatus, "REPORTED_FALSE");
    assert.equal(balance?.valueStatus, "MISSING");
    assert.equal(option?.recordedValue, "OPTION_A");
    assert.equal(option?.reasons.includes("DERIVED_FROM_REPORTING_CONFIGURATION"), true);
  });

  it("keeps an unconfigured period distinct from Option A", () => {
    const loaded = mapPersistedReportingSnapshot(
      snapshot({
        configuration: { status: "NOT_CONFIGURED", reportingPeriodId: "period-1" },
      }),
    );
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }
    const report = evaluateVS2026ReportingState(loaded.loaded.input);
    assert.equal(report.configurationStatus, "NOT_CONFIGURED");
    assert.equal(report.reportingOption, null);
  });

  it("preserves site identity, energy dimensions, and an unverified omission", () => {
    const loaded = mapPersistedReportingSnapshot(
      snapshot({
        rows: [
          row({
            id: "site-1",
            reportingPeriodId: "period-1",
            groupId: "B1_SITE",
            parentRowId: null,
            position: 1,
            values: [
              {
                id: "cell-site",
                datapointId: "B1_SITE_IDENTIFIER",
                dimensionMember: "",
                value: "Plant",
                unit: null,
              },
            ],
          }),
          row({
            id: "bio-1",
            reportingPeriodId: "period-1",
            groupId: "B5_SITE_BSA_RELATIONSHIP",
            parentRowId: "site-1",
            position: 0,
            values: [
              {
                id: "cell-name",
                datapointId: "B5_BSA_NAME",
                dimensionMember: "",
                value: "Marsh",
                unit: null,
              },
            ],
          }),
          row({
            id: "energy-1",
            reportingPeriodId: "period-1",
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            parentRowId: null,
            position: 0,
            values: [
              {
                id: "cell-renewable",
                datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
                dimensionMember: "Renewable energy",
                value: "10",
                unit: "MWh",
              },
              {
                id: "cell-other",
                datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
                dimensionMember: "Non-renewable energy",
                value: "4",
                unit: "MWh",
              },
            ],
          }),
          row({
            id: "omit-1",
            reportingPeriodId: "period-1",
            groupId: "B1_OMITTED_DISCLOSURES",
            parentRowId: null,
            position: 0,
            values: [
              {
                id: "cell-omit",
                datapointId: "B1_OMITTED_DISCLOSURES",
                dimensionMember: "22(a)",
                value: "B3_GROSS_SCOPE1_TCO2E",
                unit: null,
              },
            ],
          }),
        ],
      }),
    );
    assert.equal(loaded.ok, true);
    if (!loaded.ok) {
      return;
    }
    const biodiversity = loaded.loaded.rows.find((item) => item.rowId === "bio-1");
    const energy = loaded.loaded.rows.find((item) => item.rowId === "energy-1");
    assert.equal(biodiversity?.parentRowId, "site-1");
    assert.deepEqual(
      energy?.cells.map((cell) => cell.dimensionMember),
      ["Non-renewable energy", "Renewable energy"],
    );
    const projected = loaded.loaded.input.repeatingRows?.find((item) => item.rowId === "bio-1");
    const siteCell = projected?.cells.find(
      (cell) => cell.datapointId === "B5_RELATIONSHIP_SITE_REFERENCE",
    );
    assert.equal(siteCell?.presence.kind, "PRESENT");
    if (siteCell?.presence.kind === "PRESENT") {
      assert.equal(siteCell.presence.literal.kind, "SITE_REFERENCE");
      if (siteCell.presence.literal.kind === "SITE_REFERENCE") {
        assert.equal(siteCell.presence.literal.siteRowId, "site-1");
      }
    }
    assert.deepEqual(loaded.loaded.input.omissions, [
      {
        datapointId: "B3_GROSS_SCOPE1_TCO2E",
        reason: "22(a)",
        reassessedForPeriod: false,
        conditionsAssessed: false,
      },
    ]);
    const report = evaluateVS2026ReportingState(loaded.loaded.input);
    const omitted = report.datapoints.find((item) => item.datapointId === "B3_GROSS_SCOPE1_TCO2E");
    assert.equal(omitted?.omissionStatus, "UNVERIFIED");
    assert.equal(omitted?.reasons.includes("OMISSION_NOT_REASSESSED"), true);
    assert.equal(omitted?.reasons.includes("CONDITIONS_NOT_ASSESSED"), true);
    assert.equal(report.ignoredGroupIds.includes("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY"), false);
    assert.equal(report.ignoredGroupIds.includes("B1_OMITTED_DISCLOSURES"), true);
    const renewable = report.datapoints.find(
      (item) =>
        item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" &&
        item.dimensionMember === "Renewable energy",
    );
    assert.equal(renewable?.valueStatus, "PRESENT");
    assert.equal(renewable?.recordedValue, "10");
    assert.equal(renewable?.recordedUnit, "MWh");
    assert.equal(report.readiness.readyForReview, false);
  });

  it("rejects duplicate logical rows, a non-site parent, and a conflicting stored option", () => {
    const duplicateEnergy = mapPersistedReportingSnapshot(
      snapshot({
        rows: [0, 1].map((position) =>
          row({
            id: `energy-${position}`,
            reportingPeriodId: "period-1",
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            parentRowId: null,
            position,
            values: [],
          }),
        ),
      }),
    );
    assert.equal(duplicateEnergy.ok, false);
    if (!duplicateEnergy.ok) {
      assert.equal(duplicateEnergy.reason, "PERSISTED_DATA_INVALID");
      assert.equal(
        duplicateEnergy.issues.some((item) => item.code === "DUPLICATE_SINGLETON_ROW"),
        true,
      );
    }

    const duplicateCategory = mapPersistedReportingSnapshot(
      snapshot({
        rows: [0, 1].map((position) =>
          row({
            id: `scope-${position}`,
            reportingPeriodId: "period-1",
            groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
            parentRowId: null,
            position,
            values: [
              {
                id: `scope-cell-${position}`,
                datapointId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
                dimensionMember: "category-1",
                value: "3",
                unit: "tCO2eq",
              },
            ],
          }),
        ),
      }),
    );
    assert.equal(duplicateCategory.ok, false);
    if (!duplicateCategory.ok) {
      assert.equal(
        duplicateCategory.issues.some((item) => item.code === "DUPLICATE_DIMENSION"),
        true,
      );
    }

    const wrongParent = mapPersistedReportingSnapshot(
      snapshot({
        rows: [
          row({
            id: "sub-1",
            reportingPeriodId: "period-1",
            groupId: "B1_SUBSIDIARY",
            parentRowId: null,
            position: 0,
            values: [],
          }),
          row({
            id: "water-1",
            reportingPeriodId: "period-1",
            groupId: "B6_WATER_STRESS_SITE",
            parentRowId: "sub-1",
            position: 0,
            values: [],
          }),
        ],
      }),
    );
    assert.equal(wrongParent.ok, false);
    if (!wrongParent.ok) {
      assert.equal(wrongParent.issues.some((item) => item.code === "PARENT_NOT_SITE"), true);
    }

    const conflict = mapPersistedReportingSnapshot(
      snapshot({
        scalars: [{ fieldId: "B1_MODULE_OPTION", value: "OPTION_B" }],
      }),
    );
    assert.equal(conflict.ok, false);
    if (!conflict.ok) {
      assert.equal(
        conflict.issues.some((item) => item.code === "LEGACY_CONFIGURATION_CONFLICT"),
        true,
      );
    }
  });

  it("does not read legacy scope, materiality, or a stored company count", () => {
    assert.equal(SOURCE.includes("moduleScope"), false);
    assert.equal(SOURCE.includes("materiality"), false);
    assert.equal(SOURCE.includes("employeeCount"), false);
    assert.equal(/\b500\b/.test(SOURCE), false);
  });
});

function loadedInput(overrides: Partial<PersistedReportingSnapshot>) {
  const loaded = mapPersistedReportingSnapshot(snapshot(overrides));
  assert.equal(loaded.ok, true);
  if (!loaded.ok) {
    throw new Error("expected a valid snapshot");
  }
  return loaded.loaded;
}

function relief(report: ReportEvaluation, datapointId: string): DatapointEvaluation {
  const found = report.datapoints.find((item) => item.datapointId === datapointId && item.rowId === null);
  assert.ok(found, datapointId);
  return found;
}

describe("VS 2026 employee proportionality persistence", () => {
  it("keeps a missing measure missing when another workforce figure is stored", () => {
    const loaded = loadedInput({
      scalars: [{ fieldId: "B1_EMPLOYEES", value: "8" }],
    });
    assert.equal(loaded.input.employeeSize.status, "NOT_PROVIDED");
    const report = evaluateVS2026ReportingState(loaded.input);
    assert.equal(report.employeeCategory, null);
    assert.equal(relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").employeeSizeTreatment, "UNRESOLVED");
    assert.equal(relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "BLOCKED_UNASSESSED");
  });

  it("classifies an explicit measure of 8, 10, 11, and 500 without selecting the module", () => {
    const cases = [
      { value: "8", category: "EMPLOYEES_LE_10", energy: "VOLUNTARY_MISSING" },
      { value: "10", category: "EMPLOYEES_LE_10", energy: "VOLUNTARY_MISSING" },
      { value: "11", category: "EMPLOYEES_GT_10", energy: "REQUIRED_MISSING" },
      { value: "500", category: "EMPLOYEES_GT_10", energy: "REQUIRED_MISSING" },
    ] as const;
    for (const item of cases) {
      const loaded = loadedInput({
        scalars: [
          { fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value: item.value },
          { fieldId: "B1_EMPLOYEES", value: "600" },
        ],
      });
      assert.equal(loaded.input.employeeSize.status, "MEASURED");
      if (loaded.input.employeeSize.status === "MEASURED") {
        assert.equal(loaded.input.employeeSize.employeeMeasure, Number(item.value));
        assert.equal(
          loaded.input.employeeSize.measureKind,
          VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
        );
        assert.equal(loaded.input.employeeSize.reportingPeriodId, "period-1");
      }
      assert.equal(
        loaded.input.facts?.some(
          (fact) => fact.datapointId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
        ),
        false,
      );
      assert.equal(
        loaded.excludedFieldIds.includes(VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE),
        true,
      );
      const report = evaluateVS2026ReportingState(loaded.input);
      assert.equal(report.reportingOption, "OPTION_A");
      assert.equal(report.employeeCategory, item.category);
      assert.equal(relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, item.energy);
      assert.equal(relief(report, "B6_TOTAL_WATER_WITHDRAWAL_M3").completionStatus, item.energy);
      assert.equal(relief(report, "B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES").completionStatus, item.energy);
      assert.equal(relief(report, "B8_EMPLOYEES_PERMANENT").completionStatus, "REQUIRED_MISSING");
    }
  });

  it("preserves a negative or non-numeric measure as invalid", () => {
    for (const value of ["-1", "many", ""]) {
      const loaded = loadedInput({
        scalars: [{ fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value }],
      });
      const report = evaluateVS2026ReportingState(loaded.input);
      assert.equal(report.employeeCategory, null);
      assert.equal(
        report.employeeSizeRejection,
        value === "-1" ? "NEGATIVE_EMPLOYEE_MEASURE" : "NON_FINITE_EMPLOYEE_MEASURE",
      );
      const energy = relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
      assert.equal(energy.employeeSizeTreatment, "UNRESOLVED");
      assert.equal(energy.completionStatus, "BLOCKED_UNASSESSED");
      assert.notEqual(energy.completionStatus, "REQUIRED_MISSING");
    }
  });

  it("rejects a duplicated explicit measure", () => {
    const loaded = mapPersistedReportingSnapshot(
      snapshot({
        scalars: [
          { fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value: "8" },
          { fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value: "11" },
        ],
      }),
    );
    assert.equal(loaded.ok, false);
    if (!loaded.ok) {
      assert.equal(loaded.issues.some((item) => item.code === "DUPLICATE_EMPLOYEE_MEASURE"), true);
    }
  });
});

function energyCell(
  id: string,
  datapointId: string,
  dimensionMember: string,
  value: string,
  unit: string | null,
) {
  return { id, datapointId, dimensionMember, value, unit };
}

describe("VS 2026 dimensioned energy mapping", () => {
  it("passes each energy-origin member to the evaluator once", () => {
    const loaded = loadedInput({
      scalars: [
        { fieldId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH", value: "15" },
        { fieldId: "B3_ENERGY_BREAKDOWN_INFORMATION", value: "CAN_OBTAIN" },
        { fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value: "11" },
      ],
      rows: [
        row({
          id: "electricity-1",
          reportingPeriodId: "period-1",
          groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
          parentRowId: null,
          position: 0,
          values: [
            energyCell("e-renewable", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", "10", "MWh"),
            energyCell("e-other", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Non-renewable energy", "4", "MWh"),
          ],
        }),
        row({
          id: "fuels-1",
          reportingPeriodId: "period-1",
          groupId: "B3_ENERGY_CONSUMPTION_FROM_FUELS",
          parentRowId: null,
          position: 0,
          values: [
            energyCell("f-renewable", "B3_ENERGY_CONSUMPTION_FROM_FUELS", "Renewable energy", "0", "MWh"),
            energyCell("f-other", "B3_ENERGY_CONSUMPTION_FROM_FUELS", "Non-renewable energy", "3", "MWh"),
          ],
        }),
      ],
    });
    assert.equal(
      loaded.input.repeatingRows?.some((item) => item.groupId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY"),
      false,
    );
    const report = evaluateVS2026ReportingState(loaded.input);
    assert.equal(report.ignoredGroupIds.includes("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY"), false);
    assert.equal(report.ignoredGroupIds.includes("B3_ENERGY_CONSUMPTION_FROM_FUELS"), false);
    const members = (datapointId: string) =>
      report.datapoints.filter((item) => item.datapointId === datapointId).map((item) => item.dimensionMember);
    assert.deepEqual(members("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY"), [
      "Non-renewable energy",
      "Renewable energy",
      "Total",
    ]);
    const cell = (datapointId: string, member: string) =>
      report.datapoints.find(
        (item) => item.datapointId === datapointId && item.dimensionMember === member,
      );
    const renewableElectricity = cell("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy");
    const otherElectricity = cell("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Non-renewable energy");
    const totalElectricity = cell("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Total");
    const renewableFuels = cell("B3_ENERGY_CONSUMPTION_FROM_FUELS", "Renewable energy");
    const otherFuels = cell("B3_ENERGY_CONSUMPTION_FROM_FUELS", "Non-renewable energy");
    const totalFuels = cell("B3_ENERGY_CONSUMPTION_FROM_FUELS", "Total");
    assert.equal(renewableElectricity?.valueStatus, "PRESENT");
    assert.equal(renewableElectricity?.recordedValue, "10");
    assert.equal(renewableElectricity?.recordedUnit, "MWh");
    assert.equal(renewableElectricity?.completionStatus, "COMPLETE");
    assert.equal(otherElectricity?.recordedValue, "4");
    assert.equal(totalElectricity?.valueStatus, "MISSING");
    assert.equal(totalElectricity?.recordedValue, null);
    assert.equal(totalElectricity?.completionStatus, "REQUIRED_MISSING");
    assert.equal(renewableFuels?.valueStatus, "REPORTED_ZERO");
    assert.equal(renewableFuels?.recordedValue, "0");
    assert.equal(otherFuels?.recordedValue, "3");
    assert.equal(totalFuels?.valueStatus, "MISSING");
    assert.notEqual(renewableElectricity?.recordedValue, renewableFuels?.recordedValue);
    const total = relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.equal(total.recordedValue, "15");
    assert.equal(total.dimensionMember, null);
    assert.equal(total.completionStatus, "COMPLETE");
    const again = evaluateVS2026ReportingState(loaded.input);
    assert.deepEqual(again.datapoints, report.datapoints);
  });

  it("does not remove total energy when the breakdown cannot be obtained", () => {
    const loaded = loadedInput({
      scalars: [
        { fieldId: "B3_ENERGY_BREAKDOWN_INFORMATION", value: "CANNOT_OBTAIN" },
        { fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE, value: "11" },
      ],
      rows: [
        row({
          id: "electricity-1",
          reportingPeriodId: "period-1",
          groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
          parentRowId: null,
          position: 0,
          values: [
            energyCell("e-renewable", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", "10", "MWh"),
          ],
        }),
      ],
    });
    const report = evaluateVS2026ReportingState(loaded.input);
    const renewable = report.datapoints.find(
      (item) =>
        item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" &&
        item.dimensionMember === "Renewable energy",
    );
    assert.equal(renewable?.applicability, "CONDITION_NOT_MET");
    assert.equal(renewable?.completionStatus, "NOT_APPLICABLE");
    assert.equal(renewable?.recordedValue, "10");
    assert.equal(relief(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "REQUIRED_MISSING");
  });

  it("rejects an unknown energy member, a wrong unit, and a duplicate cell", () => {
    const unknown = mapPersistedReportingSnapshot(
      snapshot({
        rows: [
          row({
            id: "electricity-1",
            reportingPeriodId: "period-1",
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            parentRowId: null,
            position: 0,
            values: [
              energyCell("e-solar", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Solar", "10", "MWh"),
            ],
          }),
        ],
      }),
    );
    assert.equal(unknown.ok, false);

    const wrongUnit = mapPersistedReportingSnapshot(
      snapshot({
        rows: [
          row({
            id: "electricity-1",
            reportingPeriodId: "period-1",
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            parentRowId: null,
            position: 0,
            values: [
              energyCell("e-renewable", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", "10", "kWh"),
            ],
          }),
        ],
      }),
    );
    assert.equal(wrongUnit.ok, false);

    const duplicate = mapPersistedReportingSnapshot(
      snapshot({
        rows: [
          row({
            id: "electricity-1",
            reportingPeriodId: "period-1",
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            parentRowId: null,
            position: 0,
            values: [
              energyCell("e-1", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", "10", "MWh"),
              energyCell("e-2", "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", "12", "MWh"),
            ],
          }),
        ],
      }),
    );
    assert.equal(duplicate.ok, false);
    if (!duplicate.ok) {
      assert.equal(duplicate.issues.some((item) => item.code === "DUPLICATE_DIMENSION"), true);
    }
  });
});
