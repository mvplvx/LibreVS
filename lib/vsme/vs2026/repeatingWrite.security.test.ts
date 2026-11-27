import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";
import { createRepeatingRow, saveOmissionClaim, updateRepeatingCell } from "./repeatingWrite";

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

describe("VS 2026 repeating authorization", () => {
  it("limits repeating writes to the signed-in organisation", async () => {
    const secretA = password();
    const secretB = password();
    const emailA = `vs05b1-a-${randomUUID()}@example.com`;
    const emailB = `vs05b1-b-${randomUUID()}@example.com`;
    const created = {
      organizationIds: [] as string[],
      userIds: [] as string[],
      companyIds: [] as string[],
      periodIds: [] as string[],
    };
    try {
      const organizationA = await prisma.organization.create({ data: { name: "VS-05B1 security A" } });
      const organizationB = await prisma.organization.create({ data: { name: "VS-05B1 security B" } });
      created.organizationIds.push(organizationA.id, organizationB.id);
      const userA = await provisionCredentialUser({
        email: emailA,
        password: secretA,
        name: "Repeating A",
        organizationId: organizationA.id,
      });
      const userB = await provisionCredentialUser({
        email: emailB,
        password: secretB,
        name: "Repeating B",
        organizationId: organizationB.id,
      });
      created.userIds.push(userA.userId, userB.userId);
      const companyA = await prisma.company.create({
        data: { name: "VS-05B1 security company A", organizationId: organizationA.id, currency: "EUR" },
      });
      const companyB = await prisma.company.create({
        data: { name: "VS-05B1 security company B", organizationId: organizationB.id, currency: "EUR" },
      });
      created.companyIds.push(companyA.id, companyB.id);
      const periodA = await prisma.reportingPeriod.create({
        data: { year: 2034, companyId: companyA.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
      });
      const periodB = await prisma.reportingPeriod.create({
        data: { year: 2034, companyId: companyB.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
      });
      created.periodIds.push(periodA.id, periodB.id);
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

      const createdRow = await createRepeatingRow({
        request: request(cookieA, organizationB.id),
        reportingPeriodId: periodA.id,
        groupId: "B1_SITE",
        parentRowId: null,
        isEnabled: enabled,
      });
      assert.equal(createdRow.ok, true);
      assert.ok(createdRow.ok && createdRow.rowId);
      const rowId = createdRow.ok ? createdRow.rowId : "";
      assert.equal(
        (
          await updateRepeatingCell({
            request: request(cookieA, organizationB.id),
            reportingPeriodId: periodA.id,
            rowId,
            datapointId: "B1_SITE_IDENTIFIER",
            value: "Authorised site",
            isEnabled: enabled,
          })
        ).ok,
        true,
      );

      const anonymous = await updateRepeatingCell({
        request: request("", organizationA.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Anonymous",
        isEnabled: enabled,
      });
      assert.equal(anonymous.code, "UNAUTHENTICATED");

      await prisma.session.deleteMany({ where: { userId: userA.userId } });
      const expired = await updateRepeatingCell({
        request: request(cookieA, organizationA.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Expired",
        isEnabled: enabled,
      });
      assert.equal(expired.code, "UNAUTHENTICATED");

      const refreshed = await auth.api.signInEmail({
        body: { email: emailA, password: secretA },
        asResponse: true,
      });
      await prisma.user.update({ where: { id: userA.userId }, data: { active: false } });
      const inactive = await updateRepeatingCell({
        request: request(cookieHeader(refreshed), organizationA.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Inactive",
        isEnabled: enabled,
      });
      assert.equal(inactive.code, "UNAUTHENTICATED");
      await prisma.user.update({ where: { id: userA.userId }, data: { active: true } });
      const restored = await auth.api.signInEmail({
        body: { email: emailA, password: secretA },
        asResponse: true,
      });
      const activeCookie = cookieHeader(restored);

      const foreignPeriod = await updateRepeatingCell({
        request: request(cookieB, organizationA.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Foreign period",
        isEnabled: enabled,
      });
      assert.equal(foreignPeriod.code, "PERIOD_NOT_FOUND");
      const foreignRow = await updateRepeatingCell({
        request: request(cookieB, organizationA.id),
        reportingPeriodId: periodB.id,
        rowId,
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Foreign row",
        isEnabled: enabled,
      });
      assert.equal(foreignRow.code, "ROW_NOT_FOUND");
      const foreignSite = await createRepeatingRow({
        request: request(cookieB, organizationA.id),
        reportingPeriodId: periodB.id,
        groupId: "B5_SITE_ASSESSMENT",
        parentRowId: rowId,
        isEnabled: enabled,
      });
      assert.equal(foreignSite.code, "PARENT_NOT_FOUND");
      const guessed = await updateRepeatingCell({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        rowId: "cmguessedrowid000000000001",
        datapointId: "B1_SITE_IDENTIFIER",
        value: "Guessed",
        isEnabled: enabled,
      });
      assert.equal(guessed.code, "ROW_NOT_FOUND");
      const disabled = await createRepeatingRow({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        groupId: "B1_SUBSIDIARY",
        parentRowId: null,
        isEnabled: () => false,
      });
      assert.equal(disabled.code, "EDITOR_DISABLED");
      const unknownGroup = await createRepeatingRow({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        groupId: "NOT_A_GROUP",
        parentRowId: null,
        isEnabled: enabled,
      });
      assert.equal(unknownGroup.code, "UNKNOWN_GROUP");
      const unknownDatapoint = await updateRepeatingCell({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "NOT_A_DATAPOINT",
        value: "x",
        isEnabled: enabled,
      });
      assert.equal(unknownDatapoint.code, "UNKNOWN_DATAPOINT");
      const wrongGroup = await updateRepeatingCell({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        rowId,
        datapointId: "B1_SUBSIDIARY_NAME",
        value: "Not a site field",
        isEnabled: enabled,
      });
      assert.equal(wrongGroup.code, "GROUP_MISMATCH");
      const omission = await saveOmissionClaim({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        omittedDatapointId: "B3_GROSS_SCOPE1_TCO2E",
        reason: "22(c)",
        conditionsAssessed: true,
        reassessedForPeriod: true,
        isEnabled: enabled,
      });
      assert.equal(omission.ok, true);
      const foreignOmission = await saveOmissionClaim({
        request: request(cookieB, organizationA.id),
        reportingPeriodId: periodA.id,
        omittedDatapointId: "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
        reason: "22(a)",
        conditionsAssessed: false,
        reassessedForPeriod: false,
        isEnabled: enabled,
      });
      assert.equal(foreignOmission.code, "PERIOD_NOT_FOUND");
      const disabledOmission = await saveOmissionClaim({
        request: request(activeCookie, organizationB.id),
        reportingPeriodId: periodA.id,
        omittedDatapointId: "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
        reason: "22(a)",
        conditionsAssessed: false,
        reassessedForPeriod: false,
        isEnabled: () => false,
      });
      assert.equal(disabledOmission.code, "EDITOR_DISABLED");
      const storedClaim = await prisma.vs2026RepeatingValue.findFirst({
        where: { datapointId: "B1_OMITTED_DISCLOSURES", value: "B3_GROSS_SCOPE1_TCO2E" },
      });
      assert.equal(storedClaim?.omissionConditionsAssessed, true);
      assert.equal(storedClaim?.value, "B3_GROSS_SCOPE1_TCO2E");
      assert.equal(JSON.stringify(storedClaim).includes("secret"), false);
      assert.equal(
        (
          await prisma.vs2026RepeatingValue.findFirst({
            where: { rowId, datapointId: "B1_SITE_IDENTIFIER" },
          })
        )?.value,
        "Authorised site",
      );
      assert.equal(await prisma.vs2026RepeatingRow.count({ where: { reportingPeriodId: periodB.id } }), 0);
    } finally {
      if (created.periodIds.length > 0) {
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
