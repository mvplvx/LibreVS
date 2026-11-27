import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { POST as postDataPoint } from "../../../app/api/data-point/route";
import { GET as getExport } from "../../../app/api/reporting-period/[id]/export/route";
import { PUT as putMateriality } from "../../../app/api/reporting-period/[id]/materiality/route";
import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";
import { loadValidatedExportContext } from "../../export/loadValidatedExportContext";
import { loadVs2026Editor } from "./editorLoad";
import {
  saveVs2026ComparativeBasis,
  saveVs2026EditorScalar,
  saveVs2026EmployeeMeasure,
  saveVs2026OptionA,
} from "./editorWrite";
import { createRepeatingRow, updateRepeatingCell } from "./repeatingWrite";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { getVS2026ReportingState } from "./reportingState";

class RollbackSignal extends Error {}

function password(): string {
  return `Pw-${randomBytes(18).toString("base64url")}`;
}

function cookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const header = cookies.length > 0 ? cookies : [response.headers.get("set-cookie") ?? ""];
  return header
    .map((value) => value.split(";", 1)[0])
    .filter((value) => value.includes("="))
    .join("; ");
}

describe("VS 2026 reporting-state integration", () => {
  it("evaluates an Option A period from saved facts and refuses the other direction", async () => {
    try {
      await prisma.$transaction(
        async (tx) => {
          const organizationA = await tx.organization.create({ data: { name: "VS-06 organisation A" } });
          const organizationB = await tx.organization.create({ data: { name: "VS-06 organisation B" } });
          const company = await tx.company.create({
            data: {
              name: "VS-06 company",
              organizationId: organizationA.id,
              currency: "EUR",
              employeeCount: 650,
            },
          });
          const period = await tx.reportingPeriod.create({
            data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
          });
          const identity = { userId: "vs06-user", organizationId: organizationA.id };
          const request = new Request("http://localhost/vsme/vs2026/edit", {
            headers: { "x-user-id": "forged-user", "x-organization-id": organizationB.id },
          });
          const caller = {
            request,
            db: tx,
            resolveIdentity: async () => identity,
            isEnabled: () => true,
          };

          const before = await getVS2026ReportingState({ ...caller, reportingPeriodId: period.id });
          assert.equal(before.ok, true);
          if (before.ok) {
            assert.equal(before.standard.kind, "UNCONFIGURED");
            assert.equal(before.review.readiness, "NOT_CONFIGURED");
            assert.equal(before.reportingOption, null);
          }
          const blockedWrite = await saveVs2026EditorScalar({
            ...caller,
            reportingPeriodId: period.id,
            datapointId: "B1_LEGAL_FORM",
            value: "Aktiebolag",
          });
          assert.equal(blockedWrite.ok, false);
          if (!blockedWrite.ok) {
            assert.equal(blockedWrite.code, "CONFIGURATION_REQUIRED");
          }

          assert.equal((await saveVs2026OptionA({ ...caller, reportingPeriodId: period.id })).ok, true);
          const designated = await tx.reportingPeriod.findUnique({ where: { id: period.id } });
          assert.equal(designated?.vs2026ReportingOption, "OPTION_A");
          assert.equal(designated?.schemaVersion, "2.0.0");

          await tx.vsmeFieldMateriality.create({
            data: { reportingPeriodId: period.id, fieldId: "B1_LEGAL_FORM", materiality: "non_material" },
          });
          await tx.sustainabilityDataPoint.create({
            data: { reportingPeriodId: period.id, fieldId: "legacy-vsme-field", value: "do-not-reuse" },
          });

          const measure = await saveVs2026EmployeeMeasure({
            ...caller,
            reportingPeriodId: period.id,
            value: "8",
            confirmed: true,
          });
          assert.equal(measure.ok, true);
          if (measure.ok) {
            assert.equal(measure.employeeCategory, "EMPLOYEES_LE_10");
          }
          assert.equal(
            (
              await saveVs2026EditorScalar({
                ...caller,
                reportingPeriodId: period.id,
                datapointId: "B1_LEGAL_FORM",
                value: "Aktiebolag",
              })
            ).ok,
            true,
          );
          const site = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B1_SITE",
            parentRowId: null,
          });
          assert.equal(site.ok, true);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: site.ok ? (site.rowId ?? "") : "",
                datapointId: "B1_SITE_IDENTIFIER",
                value: "Plant A",
              })
            ).ok,
            true,
          );
          const scope3 = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
            parentRowId: null,
          });
          assert.equal(scope3.ok, true);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: scope3.ok ? (scope3.rowId ?? "") : "",
                datapointId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
                dimensionMember: "Category 1",
                value: "3",
              })
            ).ok,
            true,
          );

          const loaded = await loadVS2026EvaluationInput(
            { reportingPeriodId: period.id, organizationId: organizationA.id },
            tx,
          );
          assert.equal(loaded.ok, true);
          if (loaded.ok) {
            assert.equal(loaded.loaded.excludedFieldIds.includes("legacy-vsme-field"), true);
            assert.equal(
              (loaded.loaded.input.facts ?? []).some((fact) => fact.datapointId === "legacy-vsme-field"),
              false,
            );
          }

          const state = await getVS2026ReportingState({ ...caller, reportingPeriodId: period.id });
          assert.equal(state.ok, true);
          if (state.ok) {
            assert.equal(state.standard.kind, "VS2026");
            assert.equal(state.reportingOption, "OPTION_A");
            assert.equal(state.review.employeeCategory, "EMPLOYEES_LE_10");
            assert.equal(state.review.complianceClaim, "NOT_EVALUATED");
            assert.equal(state.review.conformityStatement, "NOT_PREPARED");
            assert.equal(state.review.readiness, "IN_PROGRESS");
            assert.equal(
              state.review.issues.some((item) => item.datapointId === "VS2026_COMPARATIVE_BASIS" && item.code === "CONDITION_UNASSESSED"),
              true,
            );
            assert.equal(
              state.review.issues.some(
                (item) => item.datapointId === "B1_LEGAL_FORM" && item.code === "REQUIRED_FACT_MISSING",
              ),
              false,
            );
            assert.equal(
              state.review.issues.some((item) => item.code === "UNRECOGNISED_SUPPLEMENTARY_INFORMATION" && item.disclosureId === "B3"),
              true,
            );
            assert.equal("requiredCoveragePercentage" in state.review, false);
          }

          const basis = await saveVs2026ComparativeBasis({
            ...caller,
            reportingPeriodId: period.id,
            value: "SUBSEQUENT",
            confirmed: true,
          });
          assert.equal(basis.ok, true);
          const subsequent = await getVS2026ReportingState({ ...caller, reportingPeriodId: period.id });
          assert.equal(subsequent.ok, true);
          if (subsequent.ok) {
            assert.notEqual(subsequent.review.readiness, "READY_FOR_REVIEW");
            assert.equal(
              subsequent.review.issues.some((item) => item.severity === "unsupported"),
              true,
            );
          }

          const editor = await loadVs2026Editor({ ...caller, reportingPeriodId: period.id });
          assert.equal(editor.status, "READY");
          if (editor.status === "READY") {
            assert.equal(editor.view.comparativeBasis, "SUBSEQUENT");
            assert.equal(editor.view.configurationStatus, "OPTION_A");
          }

          const foreign = await getVS2026ReportingState({
            ...caller,
            reportingPeriodId: period.id,
            resolveIdentity: async () => ({ userId: "other", organizationId: organizationB.id }),
          });
          assert.equal(foreign.ok, false);
          if (!foreign.ok) {
            assert.equal(foreign.code, "NOT_FOUND");
          }
          const anonymous = await getVS2026ReportingState({
            ...caller,
            reportingPeriodId: period.id,
            resolveIdentity: async () => null,
          });
          assert.equal(anonymous.ok, false);
          if (!anonymous.ok) {
            assert.equal(anonymous.code, "UNAUTHENTICATED");
          }
          const disabled = await getVS2026ReportingState({
            ...caller,
            reportingPeriodId: period.id,
            isEnabled: () => false,
          });
          assert.equal(disabled.ok, false);
          if (!disabled.ok) {
            assert.equal(disabled.code, "EDITOR_DISABLED");
          }
          const missing = await getVS2026ReportingState({
            ...caller,
            reportingPeriodId: "missing-period",
          });
          assert.equal(missing.ok, false);
          if (!missing.ok) {
            assert.equal(missing.code, "NOT_FOUND");
          }
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
    assert.equal(await prisma.company.count({ where: { name: "VS-06 company" } }), 0);
  });

  it("rejects legacy writes and exports for every reporting period", async () => {
    const secret = password();
    const email = `vs06-${randomUUID()}@example.com`;
    const created = {
      organizationIds: [] as string[],
      userIds: [] as string[],
      companyIds: [] as string[],
      periodIds: [] as string[],
    };
    try {
      const organization = await prisma.organization.create({ data: { name: "VS-06 security organisation" } });
      created.organizationIds.push(organization.id);
      const user = await provisionCredentialUser({
        email,
        password: secret,
        name: "VS-06 security",
        organizationId: organization.id,
      });
      created.userIds.push(user.userId);
      const company = await prisma.company.create({
        data: { name: "VS-06 security company", organizationId: organization.id, currency: "EUR", employeeCount: 650 },
      });
      created.companyIds.push(company.id);
      const legacyPeriod = await prisma.reportingPeriod.create({
        data: { year: 2025, companyId: company.id, schemaVersion: "2.0.0" },
      });
      const vsPeriod = await prisma.reportingPeriod.create({
        data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
      });
      created.periodIds.push(legacyPeriod.id, vsPeriod.id);
      const signed = await auth.api.signInEmail({ body: { email, password: secret }, asResponse: true });
      const cookie = cookieHeader(signed);
      function call(path: string, cookieValue: string, init?: RequestInit): Request {
        const headers = new Headers(init?.headers);
        if (cookieValue) {
          headers.set("cookie", cookieValue);
        }
        headers.set("content-type", "application/json");
        headers.set("x-user-id", "forged-user");
        headers.set("x-organization-id", "forged-org");
        return new Request(`http://localhost:3000${path}`, { ...init, headers });
      }

      const anonymous = await postDataPoint(
        call("/api/data-point", "", {
          method: "POST",
          body: JSON.stringify({
            reportingPeriodId: vsPeriod.id,
            dataPoints: [{ fieldId: "B1_LEGAL_FORM", value: "Aktiebolag" }],
          }),
        }),
      );
      assert.equal(anonymous.status, 401);

      const legacyWrite = await postDataPoint(
        call("/api/data-point", cookie, {
          method: "POST",
          body: JSON.stringify({
            reportingPeriodId: legacyPeriod.id,
            dataPoints: [{ fieldId: "legacy-vsme-field", value: "kept" }],
          }),
        }),
      );
      assert.equal(legacyWrite.status, 410);
      assert.equal(
        await prisma.sustainabilityDataPoint.findUnique({
          where: { reportingPeriodId_fieldId: { reportingPeriodId: legacyPeriod.id, fieldId: "legacy-vsme-field" } },
        }),
        null,
      );

      const rejected = await postDataPoint(
        call("/api/data-point", cookie, {
          method: "POST",
          body: JSON.stringify({
            reportingPeriodId: vsPeriod.id,
            dataPoints: [{ fieldId: "B1_LEGAL_FORM", value: "Aktiebolag" }],
          }),
        }),
      );
      assert.equal(rejected.status, 410);
      const rejectedBody = (await rejected.json()) as { error?: string };
      assert.match(rejectedBody.error ?? "", /VS 2026/);
      assert.equal(
        await prisma.sustainabilityDataPoint.count({
          where: { reportingPeriodId: vsPeriod.id, fieldId: "B1_LEGAL_FORM" },
        }),
        0,
      );

      const materiality = await putMateriality(
        call(`/api/reporting-period/${vsPeriod.id}/materiality`, cookie, {
          method: "PUT",
          body: JSON.stringify({ items: [{ fieldId: "B1_LEGAL_FORM", materiality: "non_material" }] }),
        }),
        { params: Promise.resolve({ id: vsPeriod.id }) },
      );
      assert.equal(materiality.status, 410);
      assert.equal(await prisma.vsmeFieldMateriality.count({ where: { reportingPeriodId: vsPeriod.id } }), 0);

      const exported = await getExport(call(`/api/reporting-period/${vsPeriod.id}/export`, cookie), {
        params: Promise.resolve({ id: vsPeriod.id }),
      });
      assert.equal(exported.status, 410);
      const exportBody = (await exported.json()) as { error?: string };
      assert.match(exportBody.error ?? "", /retired/);
      assert.equal(await prisma.vsmeExportSnapshot.count({ where: { reportingPeriodId: vsPeriod.id } }), 0);
      const context = await loadValidatedExportContext(vsPeriod.id, organization.id);
      assert.equal(context.ok, false);
      if (!context.ok) {
        assert.match(context.error, /retired/);
      }

      await prisma.user.update({ where: { id: user.userId }, data: { active: false } });
      const inactive = await getVS2026ReportingState({
        reportingPeriodId: vsPeriod.id,
        request: call(`/vsme/vs2026/edit/${vsPeriod.id}`, cookie),
        db: prisma,
        isEnabled: () => true,
      });
      assert.equal(inactive.ok, false);
      if (!inactive.ok) {
        assert.equal(inactive.code, "UNAUTHENTICATED");
      }
    } finally {
      if (created.periodIds.length > 0) {
        await prisma.vs2026RepeatingValue.deleteMany({
          where: { row: { reportingPeriodId: { in: created.periodIds } } },
        });
        await prisma.vs2026RepeatingRow.deleteMany({ where: { reportingPeriodId: { in: created.periodIds } } });
        await prisma.vsmeFieldMateriality.deleteMany({ where: { reportingPeriodId: { in: created.periodIds } } });
        await prisma.sustainabilityDataPoint.deleteMany({ where: { reportingPeriodId: { in: created.periodIds } } });
        await prisma.vsmeExportSnapshot.deleteMany({ where: { reportingPeriodId: { in: created.periodIds } } });
        await prisma.reportingPeriod.deleteMany({ where: { id: { in: created.periodIds } } });
      }
      if (created.companyIds.length > 0) {
        await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } });
      }
      if (created.userIds.length > 0) {
        await prisma.session.deleteMany({ where: { userId: { in: created.userIds } } });
        await prisma.account.deleteMany({ where: { userId: { in: created.userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
      }
      if (created.organizationIds.length > 0) {
        await prisma.organization.deleteMany({ where: { id: { in: created.organizationIds } } });
      }
    }
  });
});
