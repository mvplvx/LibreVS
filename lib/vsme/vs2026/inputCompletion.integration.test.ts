import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import { evaluateVS2026ReportingState } from "./evaluation";
import { loadVs2026Editor } from "./editorLoad";
import { saveVs2026EditorScalar, saveVs2026OptionA } from "./editorWrite";
import { createRepeatingRow, deleteRepeatingRow, saveOmissionClaim, updateRepeatingCell } from "./repeatingWrite";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { getVS2026RegulatoryPreview } from "./regulatoryPreview";

class RollbackSignal extends Error {}

describe("VS 2026 input completion", () => {
  it("saves the new assessments, reloads them, and keeps omission claims structural", async () => {
    try {
      await prisma.$transaction(
        async (tx) => {
          const organizationA = await tx.organization.create({ data: { name: "VS-05B2 organisation A" } });
          const organizationB = await tx.organization.create({ data: { name: "VS-05B2 organisation B" } });
          const company = await tx.company.create({
            data: { name: "VS-05B2 company", organizationId: organizationA.id, currency: "EUR", employeeCount: 650 },
          });
          const period = await tx.reportingPeriod.create({
            data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
          });
          const otherPeriod = await tx.reportingPeriod.create({
            data: { year: 2027, companyId: company.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
          });
          const identity = { userId: "vs05b2-user", organizationId: organizationA.id };
          const request = new Request("http://localhost/vsme/vs2026/edit", {
            headers: { "x-user-id": "forged-user", "x-organization-id": organizationB.id },
          });
          const caller = {
            request,
            db: tx,
            resolveIdentity: async () => identity,
            isEnabled: () => true,
          };

          assert.equal((await saveVs2026OptionA({ ...caller, reportingPeriodId: period.id })).ok, true);

          async function save(datapointId: string, value: string | null, expectedUpdatedAt?: string | null, overwrite?: boolean) {
            return saveVs2026EditorScalar({
              ...caller,
              reportingPeriodId: period.id,
              datapointId,
              value,
              expectedUpdatedAt,
              overwrite,
            });
          }

          const legalForm = await save("B1_LEGAL_FORM", "Aktiebolag");
          assert.equal(legalForm.ok, true, legalForm.ok ? "" : `${legalForm.code}: ${legalForm.message}`);
          assert.equal(legalForm.ok && typeof legalForm.updatedAt, "string");
          const firstVersion = legalForm.ok ? legalForm.updatedAt : null;
          const replaced = await save("B1_LEGAL_FORM", "GmbH", firstVersion);
          assert.equal(replaced.ok, true);
          const stale = await save("B1_LEGAL_FORM", "SAS", firstVersion);
          assert.equal(stale.code, "CONFLICT");
          assert.equal(
            (
              await tx.sustainabilityDataPoint.findUnique({
                where: { reportingPeriodId_fieldId: { reportingPeriodId: period.id, fieldId: "B1_LEGAL_FORM" } },
              })
            )?.value,
            "GmbH",
          );
          const overwritten = await save("B1_LEGAL_FORM", "Aktiebolag", firstVersion, true);
          assert.equal(overwritten.ok, true);

          assert.equal((await save("B1_NACE_CODES", '["01.11","10.20"]')).ok, true);
          assert.equal((await save("B1_NACE_CODES", "01.11,10.20")).code, "INVALID_VALUE");
          assert.equal(
            (
              await tx.sustainabilityDataPoint.findUnique({
                where: { reportingPeriodId_fieldId: { reportingPeriodId: period.id, fieldId: "B1_NACE_CODES" } },
              })
            )?.value,
            '["01.11","10.20"]',
          );
          assert.equal((await save("B1_EXPLICIT_COMPLIANCE_STATEMENT", "The report complies.")).code, "NOT_EDITABLE");
          assert.equal((await save("B4_PUBLIC_DISCLOSURE_URL", "https://example.com/pollution")).ok, true);
          assert.equal((await save("B4_PUBLIC_DISCLOSURE_URL", "javascript:alert(1)")).code, "INVALID_VALUE");
          assert.equal(
            (
              await tx.sustainabilityDataPoint.findUnique({
                where: { reportingPeriodId_fieldId: { reportingPeriodId: period.id, fieldId: "B4_PUBLIC_DISCLOSURE_URL" } },
              })
            )?.value,
            "https://example.com/pollution",
          );
          assert.equal((await save("B7_WASTE_DIVERTED_PROPORTION", "0")).ok, true);
          assert.equal((await save("B7_WASTE_DIVERTED_PROPORTION", "40")).ok, true);
          assert.equal((await save("B7_WASTE_RECYCLING_PERCENT_MASS", "10")).code, "NOT_EDITABLE");
          assert.equal((await save("B8_MULTI_COUNTRY_OPERATIONS", "OPERATES_IN_MORE_THAN_ONE_COUNTRY")).ok, true);
          assert.equal((await save("B9_HOURS_WORKED_ORIGIN", "ESTIMATED")).ok, true);
          assert.equal((await save("B9_ACCIDENT_RATE_BASIS", "BASIS_200000_HOURS")).ok, true);
          assert.equal((await save("B9_FATALITY_LEGAL_RESTRICTION", "RESTRICTION_AFFECTS_DISCLOSURE")).ok, true);
          assert.equal((await save("B9_RECORDABLE_ACCIDENT_RATE", "1.5")).ok, true);
          assert.equal((await save("B10_MINIMUM_WAGE_DETERMINATION", "STATUTORY_MINIMUM_WAGE")).ok, true);
          assert.equal((await save("B10_MINIMUM_WAGE_DETERMINATION", "COLLECTIVELY_AGREED_MINIMUM_REMUNERATION")).ok, true);
          assert.equal((await save("B10_MINIMUM_WAGE_DETERMINATION", "NO_APPLICABLE_MINIMUM_IDENTIFIED")).ok, true);
          assert.equal((await save("B10_MINIMUM_WAGE_DETERMINATION", "DETERMINATION_UNRESOLVED")).ok, true);
          assert.equal((await save("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", "YES")).ok, true);
          assert.equal((await save("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", "NO")).ok, true);
          assert.equal((await save("B10_GENDER_PAY_GAP_LEGAL_OBLIGATION", "NO_IDENTIFIED_REPORTING_REQUIREMENT")).ok, true);
          assert.equal((await save("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "CONVICTIONS_OCCURRED")).ok, true);
          assert.equal((await save("B11_CONVICTIONS_COUNT", "2")).ok, true);
          assert.equal((await save("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "FINES_OCCURRED")).ok, true);
          assert.equal((await save("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "NEITHER_AFTER_ASSESSMENT")).ok, true);
          assert.equal((await save("B11_CONVICTIONS_AND_FINES_ASSESSMENT", null)).ok, true);
          assert.equal((await save("B2_HAS_PRACTICES", "false")).ok, true);
          assert.equal((await save("B1_COUNTRY_PRIMARY_OPERATIONS", "Sweden")).ok, true);

          const site = await createRepeatingRow({ ...caller, reportingPeriodId: period.id, groupId: "B1_SITE", parentRowId: null });
          assert.ok(site.ok && site.rowId);
          const siteId = site.ok ? site.rowId : "";
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: siteId,
                datapointId: "B1_SITE_COUNTRY",
                value: "SE",
              })
            ).ok,
            true,
          );
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: siteId,
                datapointId: "B1_SITE_GPS_LOCATION",
                value: "59.3293,18.0686",
              })
            ).ok,
            true,
          );
          const contracts = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
            parentRowId: null,
          });
          assert.ok(contracts.ok && contracts.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: contracts.ok ? contracts.rowId : "",
                datapointId: "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
                value: "DE",
              })
            ).ok,
            true,
          );

          const draft = await saveOmissionClaim({
            ...caller,
            reportingPeriodId: period.id,
            omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
            reason: "22(b)",
            conditionsAssessed: false,
            reassessedForPeriod: false,
          });
          assert.equal(draft.ok, true);
          const claimId = draft.ok ? draft.rowId : "";
          assert.equal(
            (
              await saveOmissionClaim({
                ...caller,
                reportingPeriodId: period.id,
                omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
                reason: "trade secret details",
                conditionsAssessed: true,
                reassessedForPeriod: true,
                rowId: claimId,
              })
            ).code,
            "INVALID_VALUE",
          );
          const groundsOnly = await saveOmissionClaim({
            ...caller,
            reportingPeriodId: period.id,
            omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
            reason: "22(b)",
            conditionsAssessed: true,
            reassessedForPeriod: false,
            rowId: claimId,
          });
          assert.equal(groundsOnly.ok, true);
          const complete = await saveOmissionClaim({
            ...caller,
            reportingPeriodId: period.id,
            omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
            reason: "22(b)",
            conditionsAssessed: true,
            reassessedForPeriod: true,
            rowId: claimId,
          });
          assert.equal(complete.ok, true);
          assert.equal(
            (
              await saveOmissionClaim({
                ...caller,
                reportingPeriodId: period.id,
                omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
                reason: "22(a)",
                conditionsAssessed: true,
                reassessedForPeriod: true,
              })
            ).code,
            "DUPLICATE_FACT",
          );
          const foreign = await saveOmissionClaim({
            ...caller,
            resolveIdentity: async () => ({ userId: "other", organizationId: organizationB.id }),
            reportingPeriodId: period.id,
            omittedDatapointId: "B3_GROSS_SCOPE3_TCO2E",
            reason: "22(a)",
            conditionsAssessed: false,
            reassessedForPeriod: false,
          });
          assert.equal(foreign.code, "PERIOD_NOT_FOUND");
          const disabled = await saveOmissionClaim({
            ...caller,
            isEnabled: () => false,
            reportingPeriodId: period.id,
            omittedDatapointId: "B3_GROSS_SCOPE3_TCO2E",
            reason: "22(a)",
            conditionsAssessed: false,
            reassessedForPeriod: false,
          });
          assert.equal(disabled.code, "EDITOR_DISABLED");

          const loaded = await loadVS2026EvaluationInput(
            { reportingPeriodId: period.id, organizationId: organizationA.id },
            tx,
          );
          assert.equal(loaded.ok, true);
          if (!loaded.ok) {
            return;
          }
          const report = evaluateVS2026ReportingState(loaded.loaded.input);
          assert.equal(report.complianceClaim, "NOT_EVALUATED");
          assert.equal(report.completionAssessment, "NOT_EVALUATED");
          const byId = new Map(report.datapoints.map((item) => [item.datapointId, item]));
          assert.equal(byId.get("B1_LEGAL_FORM")?.recordedValue, "Aktiebolag");
          assert.equal(byId.get("B1_NACE_CODES")?.recordedValue, '["01.11","10.20"]');
          assert.equal(byId.get("B4_PUBLIC_DISCLOSURE_URL")?.recordedValue, "https://example.com/pollution");
          assert.equal(byId.get("B7_WASTE_DIVERTED_PROPORTION")?.recordedValue, "40");
          assert.equal(byId.get("B7_WASTE_RECYCLING_PERCENT_MASS")?.outputRole, "DIGITAL_ONLY");
          assert.equal(byId.get("B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS")?.outputRole, "DIGITAL_ONLY");
          assert.equal(byId.get("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE")?.recordedValue, "NO");
          assert.equal(byId.get("B11_CONVICTIONS_AND_FINES_ASSESSMENT")?.valueStatus, "MISSING");
          assert.notEqual(byId.get("B11_CONVICTIONS_COUNT")?.recordedValue, "0");
          assert.equal(byId.get("B2_HAS_PRACTICES")?.valueStatus, "REPORTED_FALSE");
          assert.equal(byId.get("B1_COUNTRY_PRIMARY_OPERATIONS")?.recordedValue, "Sweden");
          const omitted = byId.get("B3_GROSS_SCOPE1_TCO2E");
          assert.equal(omitted?.omissionStatus, "VALID");
          assert.equal(JSON.stringify(omitted).includes("LEGALLY_APPROVED"), false);

          const other = await loadVS2026EvaluationInput(
            { reportingPeriodId: otherPeriod.id, organizationId: organizationA.id },
            tx,
          );
          assert.equal(other.ok, true);
          if (other.ok) {
            assert.equal(other.loaded.input.omissions?.length ?? 0, 0);
          }

          const editor = await loadVs2026Editor({ ...caller, reportingPeriodId: period.id });
          assert.equal(editor.status, "READY");
          if (editor.status === "READY") {
            const legal = editor.view.disclosures
              .flatMap((disclosure) => disclosure.fields)
              .find((field) => field.id === "B1_LEGAL_FORM");
            assert.equal(legal?.value, "Aktiebolag");
            const claim = editor.view.repeatingGroups.find((group) => group.id === "B1_OMITTED_DISCLOSURES");
            assert.equal(claim?.rows.length, 1);
            assert.equal(claim?.rows[0]?.cells[0]?.label, "STRUCTURALLY_COMPLETE");
            assert.equal(claim?.readOnlyNotice?.includes("not an independent legal approval"), true);
            const compliance = editor.view.disclosures
              .flatMap((disclosure) => disclosure.unavailable)
              .find((field) => field.id === "B1_EXPLICIT_COMPLIANCE_STATEMENT");
            assert.equal(compliance?.reason.includes("finalised"), true);
          }

          const preview = await getVS2026RegulatoryPreview({
            reportingPeriodId: period.id,
            request,
            db: tx,
            isEnabled: () => true,
            resolveIdentity: async () => identity,
          });
          assert.equal(preview.ok, true);
          if (preview.ok) {
            assert.equal(preview.view.complianceClaim, "Not evaluated");
            const shown = preview.view.disclosures
              .flatMap((disclosure) => disclosure.datapoints)
              .find((item) => item.datapointId === "B3_GROSS_SCOPE1_TCO2E");
            assert.equal(shown?.completionStatus.includes("not an independent legal approval"), true);
            assert.equal(JSON.stringify(preview.view).includes("LEGALLY_APPROVED"), false);
          }

          assert.equal((await deleteRepeatingRow({ ...caller, reportingPeriodId: period.id, rowId: claimId ?? "" })).ok, true);
          const afterDelete = await loadVS2026EvaluationInput(
            { reportingPeriodId: period.id, organizationId: organizationA.id },
            tx,
          );
          assert.equal(afterDelete.ok, true);
          if (afterDelete.ok) {
            assert.equal(afterDelete.loaded.input.omissions?.length ?? 0, 0);
            const cleared = evaluateVS2026ReportingState(afterDelete.loaded.input);
            assert.equal(
              cleared.datapoints.find((item) => item.datapointId === "B3_GROSS_SCOPE1_TCO2E")?.omissionStatus,
              "NONE",
            );
          }
          const removedRow = await updateRepeatingCell({
            ...caller,
            reportingPeriodId: period.id,
            rowId: siteId,
            datapointId: "B1_SITE_IDENTIFIER",
            value: "Plant",
          });
          assert.equal(removedRow.ok, true);
          assert.equal((await deleteRepeatingRow({ ...caller, reportingPeriodId: period.id, rowId: siteId })).ok, true);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: siteId,
                datapointId: "B1_SITE_IDENTIFIER",
                value: "Late",
              })
            ).code,
            "ROW_NOT_FOUND",
          );

          throw new RollbackSignal();
        },
        { timeout: 30_000 },
      );
      assert.fail("expected rollback");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }
    assert.equal(await prisma.company.count({ where: { name: "VS-05B2 company" } }), 0);
  });
});
