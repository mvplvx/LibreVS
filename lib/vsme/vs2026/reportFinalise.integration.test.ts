import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import { saveVs2026ComparativeBasis, saveVs2026EditorScalar, saveVs2026EmployeeMeasure, saveVs2026OptionA } from "./editorWrite";
import type { ReportingConfigurationDb } from "./reportingConfiguration";
import { finaliseVS2026Report, readFinalVS2026ReportDownload } from "./reportFinalise";
import { proposedConformityStatement } from "./reportDataset";
import { getVS2026ReportingState } from "./reportingState";
import { registryDatapoint, validateScalarWrite } from "./scalarEligibility";
import type { Vs2026Datapoint } from "./registry/types";

class RollbackSignal extends Error {}

function caller(organizationId: string, db: ReportingConfigurationDb) {
  return {
    db,
    resolveIdentity: async () => ({ userId: "vs07a-user", organizationId }),
    isEnabled: () => true,
    request: new Request("http://localhost/vsme/vs2026/report", {
      headers: { "x-user-id": "forged-user", "x-organization-id": "forged-org" },
    }),
  };
}

function sample(datapoint: Vs2026Datapoint): string | null {
  if (datapoint.id === "B1_LEGAL_FORM") return "Aktiebolag";
  if (datapoint.id === "B1_NACE_CODES") return "[\"01.11\"]";
  if (datapoint.id === "B1_REPORTING_BASIS") return "INDIVIDUAL";
  if (datapoint.id === "B4_REPORTING_CONDITION") return "NEITHER";
  if (datapoint.id === "B4_PUBLIC_DISCLOSURE_URL") return "https://example.test/pollutants";
  if (datapoint.id === "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES") return "NO_SUCH_PROCESSES_IDENTIFIED";
  if (datapoint.id === "B8_MULTI_COUNTRY_OPERATIONS") return "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY";
  if (datapoint.id === "B11_CONVICTIONS_AND_FINES_ASSESSMENT") return "NEITHER_AFTER_ASSESSMENT";
  const value = datapoint.value;
  if (value.kind === "BOOLEAN") return "false";
  if (value.kind === "ENUMERATION") {
    const preferred = value.members.find((member) => /NO|NEITHER|NOT_|INDIVIDUAL|DOES_NOT|NONE/.test(member.id));
    return preferred?.id ?? value.members[0]?.id ?? null;
  }
  if (value.kind === "COUNTRY_CODE") return "SE";
  if (value.kind === "GPS_LOCATION") return "59.33,18.07";
  if (value.kind === "TEXT" || value.kind === "NARRATIVE") return "Reported";
  if (value.kind === "PERCENTAGE" || value.kind === "PROPORTION") return "0";
  if (
    value.kind === "NUMBER" ||
    value.kind === "MONETARY" ||
    value.kind === "QUANTITY" ||
    value.kind === "COUNT" ||
    value.kind === "WORKFORCE_COUNT" ||
    value.kind === "ACCIDENT_RATE" ||
    value.kind === "HOURS_WORKED" ||
    value.kind === "HOURS_AVERAGE"
  ) {
    return "1";
  }
  return null;
}

describe("VS 2026 report finalisation", () => {
  it("rejects periods that are not an explicit first-year Option A report", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({ data: { name: "VS-07A organisation" } });
        const other = await tx.organization.create({ data: { name: "VS-07A other organisation" } });
        const company = await tx.company.create({
          data: { name: "VS-07A company", organizationId: organization.id, currency: "SEK" },
        });
        const period = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
        });
        const base = caller(organization.id, tx);
        const legacy = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(legacy.ok, false);
        if (!legacy.ok) {
          assert.equal(legacy.code, "NOT_CONFIGURED");
        }

        await tx.reportingPeriod.update({ where: { id: period.id }, data: { vs2026ReportingOption: "OPTION_B" } });
        const optionB = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(optionB.ok, false);
        if (!optionB.ok) {
          assert.equal(optionB.code, "OPTION_B_UNSUPPORTED");
        }

        await tx.reportingPeriod.update({ where: { id: period.id }, data: { vs2026ReportingOption: "NOPE" } });
        const invalid = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(invalid.ok, false);
        if (!invalid.ok) {
          assert.equal(invalid.code, "INVALID_REPORTING_STATE");
        }

        await tx.reportingPeriod.update({
          where: { id: period.id },
          data: { vs2026ReportingOption: "OPTION_A", vs2026AdditionalComprehensiveDisclosures: ["C5"] },
        });
        const comprehensive = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(comprehensive.ok, false);
        if (!comprehensive.ok) {
          assert.equal(comprehensive.code, "UNSUPPORTED_COMPREHENSIVE");
        }

        await tx.reportingPeriod.update({
          where: { id: period.id },
          data: { vs2026AdditionalComprehensiveDisclosures: [] },
        });
        await tx.sustainabilityDataPoint.create({
          data: { reportingPeriodId: period.id, fieldId: "B1_LEGAL_FORM", value: "Aktiebolag" },
        });
        const provenance = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(provenance.ok, false);
        if (!provenance.ok) {
          assert.equal(provenance.code, "LEGACY_VALUE_PROVENANCE");
          assert.match(provenance.message, /not imported/i);
        }
        await tx.sustainabilityDataPoint.deleteMany({ where: { reportingPeriodId: period.id } });

        const unconfirmedBasis = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(unconfirmedBasis.ok, false);
        if (!unconfirmedBasis.ok) {
          assert.equal(unconfirmedBasis.code, "COMPARATIVE_BASIS_UNSUPPORTED");
        }
        assert.equal((await saveVs2026ComparativeBasis({
          ...base,
          reportingPeriodId: period.id,
          value: "SUBSEQUENT",
          confirmed: true,
        })).ok, true);
        const subsequent = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(subsequent.ok, false);
        if (!subsequent.ok) {
          assert.match(subsequent.message, /Subsequent-year/);
        }
        assert.equal((await saveVs2026ComparativeBasis({
          ...base,
          reportingPeriodId: period.id,
          value: "FIRST_YEAR",
          confirmed: true,
        })).ok, true);
        const notReady = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
        assert.equal(notReady.ok, false);
        if (!notReady.ok) {
          assert.equal(notReady.code, "NOT_READY");
        }
        const foreign = await finaliseVS2026Report({
          ...caller(other.id, tx),
          reportingPeriodId: period.id,
          confirmed: true,
        });
        assert.equal(foreign.ok, false);
        if (!foreign.ok) {
          assert.equal(foreign.code, "NOT_FOUND");
        }
        assert.equal(await tx.vs2026ReportSnapshot.count({ where: { reportingPeriodId: period.id } }), 0);
        assert.equal(await tx.vsmeExportSnapshot.count({ where: { reportingPeriodId: period.id } }), 0);
        assert.equal((await tx.reportingPeriod.findUnique({ where: { id: period.id } }))?.status, "draft");
        throw new RollbackSignal();
      }, { timeout: 30_000 });
      assert.fail("expected rollback");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }
    assert.equal(await prisma.company.count({ where: { name: "VS-07A company" } }), 0);
  });

  it("stores an immutable revision and keeps it after later edits", async () => {
    const organization = await prisma.organization.create({ data: { name: "VS-07A final organisation" } });
    const company = await prisma.company.create({
      data: { name: "VS-07A final company", organizationId: organization.id, currency: "EUR" },
    });
    const period = await prisma.reportingPeriod.create({
      data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
    });
    const base = caller(organization.id, prisma);
    try {
      assert.equal((await saveVs2026OptionA({ ...base, reportingPeriodId: period.id })).ok, true);
      assert.equal((await saveVs2026EmployeeMeasure({
        ...base,
        reportingPeriodId: period.id,
        value: "8",
        confirmed: true,
      })).ok, true);
      assert.equal((await saveVs2026ComparativeBasis({
        ...base,
        reportingPeriodId: period.id,
        value: "FIRST_YEAR",
        confirmed: true,
      })).ok, true);
      const gates: Record<string, string> = {
        B2_HAS_PRACTICES: "false",
        B2_HAS_POLICIES: "false",
        B2_HAS_FUTURE_INITIATIVES: "false",
        B3_ENERGY_BREAKDOWN_INFORMATION: "CANNOT_OBTAIN",
        B4_REPORTING_CONDITION: "NEITHER",
        B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES: "NO_SUCH_PROCESSES_IDENTIFIED",
        B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES: "NO",
        B7_SIGNIFICANT_MATERIAL_FLOWS: "NO_SIGNIFICANT_FLOWS_IDENTIFIED",
        B8_MULTI_COUNTRY_OPERATIONS: "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY",
        B9_FATALITY_LEGAL_RESTRICTION: "RESTRICTION_AFFECTS_DISCLOSURE",
        B9_HOURS_WORKED_ORIGIN: "MEASURED",
        B9_ACCIDENT_RATE_BASIS: "BASIS_200000_HOURS",
        B10_MINIMUM_WAGE_DETERMINATION: "NO_APPLICABLE_MINIMUM_IDENTIFIED",
        B10_GENDER_PAY_GAP_LEGAL_OBLIGATION: "NO_IDENTIFIED_REPORTING_REQUIREMENT",
        B11_CONVICTIONS_AND_FINES_ASSESSMENT: "NEITHER_AFTER_ASSESSMENT",
      };
      for (const [datapointId, value] of Object.entries(gates)) {
        const saved = await saveVs2026EditorScalar({
          ...base,
          reportingPeriodId: period.id,
          datapointId,
          value,
          overwrite: true,
        });
        assert.equal(saved.ok, true, `${datapointId} ${saved.ok ? "" : saved.message}`);
      }

      for (let pass = 0; pass < 8; pass += 1) {
        const state = await getVS2026ReportingState({ ...base, reportingPeriodId: period.id });
        assert.equal(state.ok, true);
        if (!state.ok) {
          break;
        }
        if (state.review.readiness === "READY_FOR_REVIEW") {
          break;
        }
        const targets = state.review.issues.filter(
          (item) =>
            item.datapointId &&
            (item.code === "REQUIRED_FACT_MISSING" || item.code === "CONDITION_UNASSESSED" || item.code === "INVALID_REPORTED_VALUE"),
        );
        let wrote = false;
        for (const issue of targets) {
          const datapoint = registryDatapoint(issue.datapointId ?? "");
          if (!datapoint) {
            continue;
          }
          const value = sample(datapoint);
          const validation = value === null ? null : validateScalarWrite(datapoint, value);
          if (!validation?.ok) {
            continue;
          }
          const saved = await saveVs2026EditorScalar({
            ...base,
            reportingPeriodId: period.id,
            datapointId: datapoint.id,
            value: validation.value,
            overwrite: true,
          });
          wrote = wrote || saved.ok;
        }
        if (!wrote) {
          break;
        }
      }

      const ready = await getVS2026ReportingState({ ...base, reportingPeriodId: period.id });
      assert.equal(ready.ok, true);
      if (!ready.ok) {
        return;
      }
      assert.equal(
        ready.review.readiness,
        "READY_FOR_REVIEW",
        ready.review.issues.map((item) => `${item.code}:${item.datapointId ?? item.disclosureId}`).join(", "),
      );
      const missingConfirmation = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: false });
      assert.equal(missingConfirmation.ok, false);
      if (!missingConfirmation.ok) {
        assert.equal(missingConfirmation.code, "CONFIRMATION_REQUIRED");
      }

      const [first, second] = await Promise.all([
        finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true }),
        finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true }),
      ]);
      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      if (!first.ok || !second.ok) {
        return;
      }
      assert.equal(first.snapshotId, second.snapshotId);
      assert.equal(await prisma.vs2026ReportSnapshot.count({ where: { reportingPeriodId: period.id } }), 1);
      const stored = await prisma.vs2026ReportSnapshot.findUnique({ where: { id: first.snapshotId } });
      assert.equal(stored?.finalisedByUserId, "vs07a-user");
      assert.ok(stored?.finalisedAt);
      assert.equal(stored?.regulatoryVersion, "EU-2026/1560");
      assert.equal(stored?.conformityStatement, proposedConformityStatement({ undertakingName: company.name, year: 2026 }));
      assert.equal(stored?.conformityStatement.includes("assurance opinion"), true);
      const original = await readFinalVS2026ReportDownload({ ...base, snapshotId: first.snapshotId });
      assert.equal(original.ok, true);
      if (!original.ok) {
        return;
      }
      const repeated = await readFinalVS2026ReportDownload({ ...base, snapshotId: first.snapshotId });
      assert.equal(repeated.ok, true);
      if (repeated.ok) {
        assert.equal(repeated.body, original.body);
      }
      assert.equal(original.body.includes("\"status\":\"FINAL\""), true);
      assert.equal(original.body.includes(company.name), true);

      assert.equal((await saveVs2026EditorScalar({
        ...base,
        reportingPeriodId: period.id,
        datapointId: "B1_LEGAL_FORM",
        value: "Changed after finalisation",
        overwrite: true,
      })).ok, true);
      const afterEdit = await readFinalVS2026ReportDownload({ ...base, snapshotId: first.snapshotId });
      assert.equal(afterEdit.ok, true);
      if (afterEdit.ok) {
        assert.equal(afterEdit.body, original.body);
      }
      assert.equal((await prisma.sustainabilityDataPoint.findUnique({
        where: { reportingPeriodId_fieldId: { reportingPeriodId: period.id, fieldId: "B1_LEGAL_FORM" } },
      }))?.value, "Changed after finalisation");

      const revision = await finaliseVS2026Report({ ...base, reportingPeriodId: period.id, confirmed: true });
      assert.equal(revision.ok, true);
      if (revision.ok) {
        assert.equal(revision.revision, 2);
        assert.notEqual(revision.snapshotId, first.snapshotId);
      }
      const earlier = await readFinalVS2026ReportDownload({ ...base, snapshotId: first.snapshotId });
      assert.equal(earlier.ok, true);
      if (earlier.ok) {
        assert.equal(earlier.body, original.body);
        assert.equal(earlier.body.includes("Changed after finalisation"), false);
      }
      assert.equal(await prisma.vsmeExportSnapshot.count({ where: { reportingPeriodId: period.id } }), 0);
      assert.equal((await prisma.reportingPeriod.findUnique({ where: { id: period.id } }))?.status, "draft");

      await prisma.vs2026ReportSnapshot.update({
        where: { id: first.snapshotId },
        data: { dataset: { metadata: { status: "FINAL" } } },
      });
      const corrupt = await readFinalVS2026ReportDownload({ ...base, snapshotId: first.snapshotId });
      assert.equal(corrupt.ok, false);
      if (!corrupt.ok) {
        assert.equal(corrupt.code, "INTEGRITY_FAILURE");
      }
      const foreign = await readFinalVS2026ReportDownload({
        ...caller((await prisma.organization.create({ data: { name: "VS-07A outsider" } })).id, prisma),
        snapshotId: revision.ok ? revision.snapshotId : first.snapshotId,
      });
      assert.equal(foreign.ok, false);
      if (!foreign.ok) {
        assert.equal(foreign.code, "NOT_FOUND");
      }
    } finally {
      const outsider = await prisma.organization.findFirst({ where: { name: "VS-07A outsider" } });
      await prisma.vs2026ReportSnapshot.deleteMany({ where: { reportingPeriodId: period.id } });
      await prisma.vs2026RepeatingValue.deleteMany({ where: { row: { reportingPeriodId: period.id } } });
      await prisma.vs2026RepeatingRow.deleteMany({ where: { reportingPeriodId: period.id } });
      await prisma.sustainabilityDataPoint.deleteMany({ where: { reportingPeriodId: period.id } });
      await prisma.reportingPeriod.deleteMany({ where: { id: period.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
      await prisma.organization.deleteMany({
        where: { id: { in: [organization.id, outsider?.id].filter((id): id is string => Boolean(id)) } },
      });
    }
  });
});
