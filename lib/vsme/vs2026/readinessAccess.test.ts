import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GET as getReadiness } from "../../../app/api/vsme/release/readiness/route";
import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";
import { runReadinessCheck, runReadinessCheckForOrganization } from "../release/readinessCheck";

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

describe("VS 2026 readiness organisation scope", () => {
  it("does not tell organisation A how many reporting rows organisation B has", async () => {
    const secret = password();
    const email = `vs05a-ready-${randomUUID()}@example.com`;
    const created = {
      organizationIds: [] as string[],
      userIds: [] as string[],
      companyIds: [] as string[],
      periodIds: [] as string[],
    };
    try {
      const organizationA = await prisma.organization.create({ data: { name: "VS-05A readiness A" } });
      const organizationB = await prisma.organization.create({ data: { name: `VS-05A readiness B ${randomUUID()}` } });
      created.organizationIds.push(organizationA.id, organizationB.id);
      const userA = await provisionCredentialUser({
        email,
        password: secret,
        name: "Readiness A",
        organizationId: organizationA.id,
      });
      created.userIds.push(userA.userId);
      const companyA = await prisma.company.create({
        data: { name: "VS-05A readiness company A", organizationId: organizationA.id, currency: "EUR" },
      });
      const companyB = await prisma.company.create({
        data: { name: organizationB.name, organizationId: organizationB.id, currency: "EUR" },
      });
      created.companyIds.push(companyA.id, companyB.id);
      const periodA = await prisma.reportingPeriod.create({
        data: { year: 2033, companyId: companyA.id, schemaVersion: "2.0.0" },
      });
      const periodB = await prisma.reportingPeriod.create({
        data: { year: 2033, companyId: companyB.id, schemaVersion: "2.0.0" },
      });
      created.periodIds.push(periodA.id, periodB.id);
      await prisma.sustainabilityDataPoint.create({
        data: {
          reportingPeriodId: periodA.id,
          fieldId: "B1_TURNOVER",
          value: "1",
          legacyFieldId: "readiness-a",
        },
      });
      await prisma.sustainabilityDataPoint.createMany({
        data: Array.from({ length: 7 }, (_, index) => ({
          reportingPeriodId: periodB.id,
          fieldId: `READINESS_LEAK_${index}`,
          value: "1",
          legacyFieldId: `readiness-b-${index}`,
        })),
      });
      await prisma.vsmeExportSnapshot.create({
        data: {
          reportingPeriodId: periodB.id,
          companyId: companyB.id,
          stateSnapshot: {},
          exportData: {},
          validationResult: {},
          reportingState: "draft",
          coverage: 0,
          version: 1,
        },
      });

      const scoped = await runReadinessCheckForOrganization(organizationA.id);
      const exact = "1 legacy or non-v2 data row(s) present (STRICT_V2 requires 0 for green)";
      assert.equal(scoped.blockers.includes(exact), true);
      assert.equal(scoped.blockers.some((item) => item.startsWith("7 legacy")), false);
      assert.equal(scoped.warnings.some((item) => item.includes("exportReady")), false);
      assert.equal(
        scoped.warnings.includes("No export snapshots yet — consistency check skipped"),
        true,
      );

      const systemWide = await runReadinessCheck();
      const signed = await auth.api.signInEmail({
        body: { email, password: secret },
        asResponse: true,
      });
      const headers = new Headers();
      headers.set("cookie", cookieHeader(signed));
      headers.set("x-organization-id", organizationB.id);
      const response = await getReadiness(new Request("http://localhost:3000/api/vsme/release/readiness", { headers }));
      assert.equal(response.status, 200);
      const body = await response.json();
      const serialised = JSON.stringify(body);
      assert.equal(body.data.blockers.includes(exact), true);
      assert.equal(serialised.includes(organizationB.name), false);
      assert.equal(serialised.includes("READINESS_LEAK_"), false);
      assert.equal(serialised.includes("7 legacy"), false);
      const wideLegacy = systemWide.blockers.find((item) => item.includes("legacy or non-v2"));
      assert.notEqual(wideLegacy, exact);
      assert.equal(serialised.includes(wideLegacy ?? "missing-wide-blocker"), false);

      const anonymous = await getReadiness(new Request("http://localhost:3000/api/vsme/release/readiness"));
      assert.equal(anonymous.status, 401);
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
