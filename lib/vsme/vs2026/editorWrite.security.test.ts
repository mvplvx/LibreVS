import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";
import { isVS2026EditorEnabled } from "./editorAvailability";
import { saveVs2026EditorScalar } from "./editorWrite";

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

function request(cookie: string, organizationId: string): Request {
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  headers.set("x-user-id", "forged-user");
  headers.set("x-organization-id", organizationId);
  return new Request("http://localhost:3000/vsme/vs2026/edit", { headers });
}

describe("VS 2026 editor authorization", () => {
  it("accepts a signed-in organisation member and rejects every other caller", async () => {
    const secretA = password();
    const secretB = password();
    const emailA = `vs05a-a-${randomUUID()}@example.com`;
    const emailB = `vs05a-b-${randomUUID()}@example.com`;
    const created = {
      organizationIds: [] as string[],
      userIds: [] as string[],
      companyIds: [] as string[],
      periodIds: [] as string[],
    };
    try {
      const organizationA = await prisma.organization.create({ data: { name: "VS-05A security A" } });
      const organizationB = await prisma.organization.create({ data: { name: "VS-05A security B" } });
      created.organizationIds.push(organizationA.id, organizationB.id);
      const userA = await provisionCredentialUser({
        email: emailA,
        password: secretA,
        name: "Editor A",
        organizationId: organizationA.id,
      });
      const userB = await provisionCredentialUser({
        email: emailB,
        password: secretB,
        name: "Editor B",
        organizationId: organizationB.id,
      });
      created.userIds.push(userA.userId, userB.userId);
      const companyA = await prisma.company.create({
        data: { name: "VS-05A security company A", organizationId: organizationA.id, currency: "EUR" },
      });
      const companyB = await prisma.company.create({
        data: { name: "VS-05A security company B", organizationId: organizationB.id, currency: "EUR" },
      });
      created.companyIds.push(companyA.id, companyB.id);
      const periodA = await prisma.reportingPeriod.create({
        data: { year: 2032, companyId: companyA.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
      });
      const periodB = await prisma.reportingPeriod.create({
        data: { year: 2032, companyId: companyB.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
      });
      created.periodIds.push(periodA.id, periodB.id);
      await prisma.sustainabilityDataPoint.create({
        data: {
          reportingPeriodId: periodA.id,
          fieldId: "B1_TURNOVER",
          value: "legacy-turnover",
          legacyFieldId: "v1-turnover",
        },
      });

      const signedA = await auth.api.signInEmail({
        body: { email: emailA, password: secretA },
        asResponse: true,
      });
      const cookieA = cookieHeader(signedA);
      const signedB = await auth.api.signInEmail({
        body: { email: emailB, password: secretB },
        asResponse: true,
      });
      const cookieB = cookieHeader(signedB);
      const enabled = () => true;

      const saved = await saveVs2026EditorScalar({
        request: request(cookieA, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Sweden",
        isEnabled: enabled,
      });
      assert.equal(saved.ok, true);
      assert.equal(
        (
          await prisma.sustainabilityDataPoint.findUnique({
            where: {
              reportingPeriodId_fieldId: {
                reportingPeriodId: periodA.id,
                fieldId: "B1_COUNTRY_PRIMARY_OPERATIONS",
              },
            },
          })
        )?.value,
        "Sweden",
      );

      const anonymous = await saveVs2026EditorScalar({
        request: request("", organizationA.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Norway",
        isEnabled: enabled,
      });
      assert.equal(anonymous.code, "UNAUTHENTICATED");

      await prisma.session.deleteMany({ where: { userId: userA.userId } });
      const expired = await saveVs2026EditorScalar({
        request: request(cookieA, organizationA.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Norway",
        isEnabled: enabled,
      });
      assert.equal(expired.code, "UNAUTHENTICATED");

      const refreshed = await auth.api.signInEmail({
        body: { email: emailA, password: secretA },
        asResponse: true,
      });
      const freshCookie = cookieHeader(refreshed);
      await prisma.user.update({ where: { id: userA.userId }, data: { active: false } });
      const inactive = await saveVs2026EditorScalar({
        request: request(freshCookie, organizationA.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Norway",
        isEnabled: enabled,
      });
      assert.equal(inactive.code, "UNAUTHENTICATED");
      await prisma.user.update({ where: { id: userA.userId }, data: { active: true } });
      const restored = await auth.api.signInEmail({
        body: { email: emailA, password: secretA },
        asResponse: true,
      });
      const activeCookie = cookieHeader(restored);

      const otherOrganisation = await saveVs2026EditorScalar({
        request: request(cookieB, organizationA.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Denmark",
        isEnabled: enabled,
      });
      assert.equal(otherOrganisation.code, "PERIOD_NOT_FOUND");
      const foreign = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodB.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Denmark",
        isEnabled: enabled,
      });
      assert.equal(foreign.code, "PERIOD_NOT_FOUND");
      const guessed = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: "cmguessedperiodid00000001",
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Denmark",
        isEnabled: enabled,
      });
      assert.equal(guessed.code, "PERIOD_NOT_FOUND");
      assert.equal(await prisma.sustainabilityDataPoint.count({ where: { reportingPeriodId: periodB.id } }), 0);

      const disabled = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Finland",
        isEnabled: () => false,
      });
      assert.equal(disabled.code, "EDITOR_DISABLED");
      const env = { ...process.env };
      delete env.VS2026_EDITOR_ENABLED;
      assert.equal(isVS2026EditorEnabled(env), false);
      const direct = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
        value: "Finland",
        isEnabled: (current) => isVS2026EditorEnabled(current),
      });
      assert.equal(direct.code, process.env.VS2026_EDITOR_ENABLED === "true" ? "SAVED" : "EDITOR_DISABLED");
      if (process.env.VS2026_EDITOR_ENABLED === "true") {
        await saveVs2026EditorScalar({
          request: request(activeCookie, organizationB.id),
          reportingPeriodId: periodA.id,
          datapointId: "B1_COUNTRY_PRIMARY_OPERATIONS",
          value: "Sweden",
          isEnabled: enabled,
        });
      }

      const unknown = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "NOT_A_VS2026_FIELD",
        value: "x",
        isEnabled: enabled,
      });
      assert.equal(unknown.code, "UNKNOWN_DATAPOINT");
      const readOnly = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_MODULE_OPTION",
        value: "OPTION_B",
        isEnabled: enabled,
      });
      assert.equal(readOnly.code, "NOT_EDITABLE");
      const wrongType = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B2_HAS_PRACTICES",
        value: "yes",
        isEnabled: enabled,
      });
      assert.equal(wrongType.code, "INVALID_VALUE");
      const badEnum = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_REPORTING_BASIS",
        value: "individual basis",
        isEnabled: enabled,
      });
      assert.equal(badEnum.code, "INVALID_ENUMERATION");
      const legacy = await saveVs2026EditorScalar({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        datapointId: "B1_TURNOVER",
        value: "99",
        isEnabled: enabled,
      });
      assert.equal(legacy.code, "LEGACY_ROW_PROTECTED");
      assert.equal(
        (
          await prisma.sustainabilityDataPoint.findUnique({
            where: { reportingPeriodId_fieldId: { reportingPeriodId: periodA.id, fieldId: "B1_TURNOVER" } },
          })
        )?.value,
        "legacy-turnover",
      );
      assert.equal(
        (
          await prisma.sustainabilityDataPoint.findUnique({
            where: {
              reportingPeriodId_fieldId: {
                reportingPeriodId: periodA.id,
                fieldId: "B1_COUNTRY_PRIMARY_OPERATIONS",
              },
            },
          })
        )?.value,
        "Sweden",
      );
    } finally {
      if (created.periodIds.length > 0) {
        await prisma.sustainabilityDataPoint.deleteMany({
          where: { reportingPeriodId: { in: created.periodIds } },
        });
        await prisma.reportingPeriod.deleteMany({ where: { id: { in: created.periodIds } } });
      }
      if (created.companyIds.length > 0) {
        await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } });
      }
      if (created.userIds.length > 0 || created.organizationIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            OR: [{ id: { in: created.userIds } }, { organizationId: { in: created.organizationIds } }],
          },
        });
      }
      if (created.organizationIds.length > 0) {
        await prisma.organization.deleteMany({ where: { id: { in: created.organizationIds } } });
      }
    }
  });
});
