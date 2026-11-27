import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import { evaluateVS2026ReportingState } from "./evaluation";
import { loadVs2026Editor } from "./editorLoad";
import {
  saveVs2026EditorScalar,
  saveVs2026EmployeeMeasure,
  saveVs2026OptionA,
} from "./editorWrite";
import { getReportingConfiguration } from "./reportingConfiguration";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { getVS2026RegulatoryPreview } from "./regulatoryPreview";
import type { EditorMutationResult } from "./editorView";

class RollbackSignal extends Error {}

describe("VS 2026 editor persistence", () => {
  it("saves Option A and scalar facts, then reloads them through the evaluator and preview", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const organizationA = await tx.organization.create({ data: { name: "VS-05A organisation A" } });
        const organizationB = await tx.organization.create({ data: { name: "VS-05A organisation B" } });
        const companyA = await tx.company.create({
          data: {
            name: "VS-05A company A",
            organizationId: organizationA.id,
            currency: "EUR",
            employeeCount: 650,
          },
        });
        const companyB = await tx.company.create({
          data: { name: "VS-05A company B", organizationId: organizationB.id, currency: "EUR" },
        });
        const period = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: companyA.id, schemaVersion: "2.0.0" },
        });
        const optionB = await tx.reportingPeriod.create({
          data: {
            year: 2026,
            companyId: companyA.id,
            schemaVersion: "2.0.0",
            vs2026ReportingOption: "OPTION_B",
          },
        });
        const withAdditional = await tx.reportingPeriod.create({
          data: {
            year: 2027,
            companyId: companyA.id,
            schemaVersion: "2.0.0",
            vs2026ReportingOption: "OPTION_A",
            vs2026AdditionalComprehensiveDisclosures: ["C5"],
          },
        });
        const otherPeriod = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: companyA.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
        });
        const foreignPeriod = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: companyB.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
        });
        const identity = { userId: "vs05a-user", organizationId: organizationA.id };
        const enabled = () => true;
        const request = new Request("http://localhost/vsme/vs2026/edit", {
          headers: { "x-user-id": "forged-user", "x-organization-id": organizationB.id },
        });
        const caller = {
          request,
          db: tx,
          resolveIdentity: async () => identity,
          isEnabled: enabled,
        };

        const unconfigured = await getReportingConfiguration(
          { reportingPeriodId: period.id, organizationId: organizationA.id },
          tx,
        );
        assert.equal(unconfigured.ok && unconfigured.configuration.status, "NOT_CONFIGURED");
        const loadedUnconfigured = await loadVs2026Editor({
          reportingPeriodId: period.id,
          request,
          db: tx,
          isEnabled: enabled,
          resolveIdentity: async () => identity,
        });
        assert.equal(loadedUnconfigured.status, "READY");
        if (loadedUnconfigured.status === "READY") {
          assert.equal(loadedUnconfigured.view.configurationStatus, "NOT_CONFIGURED");
        }

        const blockedFact = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Sweden",
        });
        assert.equal(blockedFact.code, "CONFIGURATION_REQUIRED");

        const saved = await saveVs2026OptionA({ ...caller, reportingPeriodId: period.id });
        assert.equal(saved.ok, true);
        const reloaded = await getReportingConfiguration(
          { reportingPeriodId: period.id, organizationId: organizationA.id },
          tx,
        );
        assert.equal(reloaded.ok && reloaded.configuration.status, "CONFIGURED");
        if (reloaded.ok && reloaded.configuration.status === "CONFIGURED") {
          assert.equal(reloaded.configuration.reportingOption, "OPTION_A");
          assert.deepEqual(reloaded.configuration.additionalComprehensiveDisclosures, []);
        }

        const keptB = await saveVs2026OptionA({ ...caller, reportingPeriodId: optionB.id });
        assert.equal(keptB.code, "OPTION_B_UNCHANGED");
        const stillB = await tx.reportingPeriod.findUnique({ where: { id: optionB.id } });
        assert.equal(stillB?.vs2026ReportingOption, "OPTION_B");
        const optionBView = await loadVs2026Editor({
          reportingPeriodId: optionB.id,
          request,
          db: tx,
          isEnabled: enabled,
          resolveIdentity: async () => identity,
        });
        assert.equal(optionBView.status, "OPTION_B");

        const keptAdditional = await saveVs2026OptionA({ ...caller, reportingPeriodId: withAdditional.id });
        assert.equal(keptAdditional.ok, true);
        const additionalRow = await tx.reportingPeriod.findUnique({ where: { id: withAdditional.id } });
        assert.deepEqual(additionalRow?.vs2026AdditionalComprehensiveDisclosures, ["C5"]);

        async function employees(value: string | null, confirmed = true): Promise<EditorMutationResult> {
          return saveVs2026EmployeeMeasure({
            ...caller,
            reportingPeriodId: period.id,
            value,
            confirmed,
          });
        }
        const eight = await employees("8");
        const ten = await employees("10");
        const eleven = await employees("11");
        assert.equal(eight.ok && eight.employeeCategory, "EMPLOYEES_LE_10");
        assert.equal(ten.ok && ten.employeeCategory, "EMPLOYEES_LE_10");
        assert.equal(eleven.ok && eleven.employeeCategory, "EMPLOYEES_GT_10");
        const optionAfterMeasure = await tx.reportingPeriod.findUnique({ where: { id: period.id } });
        assert.equal(optionAfterMeasure?.vs2026ReportingOption, "OPTION_A");
        const clearedMeasure = await employees(null);
        assert.equal(clearedMeasure.ok && clearedMeasure.employeeCategory, "NOT_PROVIDED");
        assert.equal(
          await tx.sustainabilityDataPoint.count({
            where: { reportingPeriodId: period.id, fieldId: "VS2026_EMPLOYEE_PROPORTIONALITY" },
          }),
          0,
        );
        const invalidMeasure = await employees("nope");
        assert.equal(invalidMeasure.code, "INVALID_VALUE");
        const unconfirmed = await employees("8", false);
        assert.equal(unconfirmed.code, "CONFIRMATION_REQUIRED");
        const restoredMeasure = await employees("8");
        assert.equal(restoredMeasure.ok && restoredMeasure.employeeCategory, "EMPLOYEES_LE_10");

        const flag = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B2_HAS_PRACTICES",
          value: "false",
        });
        assert.equal(flag.ok, true);
        const zero = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
          value: "0",
        });
        assert.equal(zero.ok, true);
        const text = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Sweden",
        });
        assert.equal(text.ok, true);
        const enumeration = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_REPORTING_BASIS",
          value: "INDIVIDUAL",
        });
        assert.equal(enumeration.ok, true);
        const updated = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Norway",
        });
        assert.equal(updated.ok, true);
        const cleared = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "   ",
        });
        assert.equal(cleared.code, "CLEARED");
        const restored = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Sweden",
        });
        assert.equal(restored.ok, true);

        const energyRow = await tx.sustainabilityDataPoint.findUnique({
          where: {
            reportingPeriodId_fieldId: {
              reportingPeriodId: period.id,
              fieldId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
            },
          },
        });
        assert.equal(energyRow?.value, "0");
        assert.equal(energyRow?.unit, "MWh");
        assert.equal(
          await tx.sustainabilityDataPoint.count({
            where: { reportingPeriodId: otherPeriod.id, fieldId: "B2_HAS_PRACTICES" },
          }),
          0,
        );

        const foreign = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: foreignPeriod.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Denmark",
        });
        assert.equal(foreign.code, "PERIOD_NOT_FOUND");
        assert.equal(await tx.sustainabilityDataPoint.count({ where: { reportingPeriodId: foreignPeriod.id } }), 0);

        await tx.sustainabilityDataPoint.create({
          data: {
            reportingPeriodId: period.id,
            fieldId: "B1_TURNOVER",
            value: "12",
            legacyFieldId: "v1-turnover",
          },
        });
        const legacy = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_TURNOVER",
          value: "99",
        });
        assert.equal(legacy.code, "LEGACY_ROW_PROTECTED");
        const legacyRow = await tx.sustainabilityDataPoint.findUnique({
          where: { reportingPeriodId_fieldId: { reportingPeriodId: period.id, fieldId: "B1_TURNOVER" } },
        });
        assert.equal(legacyRow?.value, "12");

        const collision = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION",
          value: "A narrative",
        });
        assert.equal(collision.code, "NOT_EDITABLE");
        const derived = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B1_MODULE_OPTION",
          value: "OPTION_B",
        });
        assert.equal(derived.code, "NOT_EDITABLE");
        assert.equal((await tx.reportingPeriod.findUnique({ where: { id: period.id } }))?.vs2026ReportingOption, "OPTION_A");

        const disabled = await saveVs2026EditorScalar({
          ...caller,
          isEnabled: () => false,
          reportingPeriodId: period.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Finland",
        });
        assert.equal(disabled.code, "EDITOR_DISABLED");
        assert.equal(
          (
            await tx.sustainabilityDataPoint.findUnique({
              where: {
                reportingPeriodId_fieldId: {
                  reportingPeriodId: period.id,
                  fieldId: "B1_COUNTRY_PRIMARY_OPERATIONS",
                },
              },
            })
          )?.value,
          "Sweden",
        );

        await tx.vsmeFieldMateriality.create({
          data: { reportingPeriodId: period.id, fieldId: "B2_HAS_PRACTICES", materiality: "non_material" },
        });
        const loaded = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId: organizationA.id },
          tx,
        );
        assert.equal(loaded.ok, true);
        if (!loaded.ok) {
          return;
        }
        const report = evaluateVS2026ReportingState(loaded.loaded.input);
        assert.equal(report.reportingOption, "OPTION_A");
        assert.equal(report.employeeCategory, "EMPLOYEES_LE_10");
        assert.equal(report.completionAssessment, "NOT_EVALUATED");
        assert.equal(report.complianceClaim, "NOT_EVALUATED");
        const byId = new Map(report.datapoints.map((item) => [item.datapointId, item]));
        assert.equal(byId.get("B2_HAS_PRACTICES")?.valueStatus, "REPORTED_FALSE");
        assert.equal(byId.get("B3_TOTAL_ENERGY_CONSUMPTION_MWH")?.valueStatus, "REPORTED_ZERO");
        assert.equal(byId.get("B1_COUNTRY_PRIMARY_OPERATIONS")?.recordedValue, "Sweden");
        assert.equal(byId.get("B1_REPORTING_BASIS")?.recordedValue, "INDIVIDUAL");
        assert.equal(byId.get("B1_LEGAL_FORM")?.valueStatus, "MISSING");

        const preview = await getVS2026RegulatoryPreview({
          reportingPeriodId: period.id,
          request,
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => identity,
        });
        assert.equal(preview.ok, true);
        if (preview.ok) {
          assert.equal(preview.view.reportingOptionLabel, "Option A — Basic Module");
          assert.equal(preview.view.employeeCategoryLabel, "10 employees or fewer");
          assert.equal(preview.view.completionAssessment, "Not evaluated");
          assert.equal(preview.view.complianceClaim, "Not evaluated");
          assert.equal(preview.view.summary.reportedZero > 0, true);
          assert.equal(preview.view.summary.reportedFalse > 0, true);
          const country = preview.view.disclosures
            .flatMap((disclosure) => disclosure.datapoints)
            .find((item) => item.datapointId === "B1_COUNTRY_PRIMARY_OPERATIONS");
          assert.equal(country?.recordedValue, "Sweden");
          assert.equal(country?.valueStatus, "Reported");
        }

        const hidden = await loadVs2026Editor({
          reportingPeriodId: period.id,
          request,
          db: tx,
          isEnabled: () => false,
          resolveIdentity: async () => identity,
        });
        assert.equal(hidden.status, "DISABLED");
        throw new RollbackSignal();
      });
      assert.fail("expected rollback");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }
    assert.equal(await prisma.company.count({ where: { name: "VS-05A company A" } }), 0);
  });
});
