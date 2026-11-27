import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { POST as postDataPoint } from "../../../app/api/data-point/route";
import { GET as getExportJson } from "../../../app/api/reporting-period/[id]/export/json/route";
import { POST as postPeriod } from "../../../app/api/reporting-period/route";
import { GET as getSchema } from "../../../app/api/vsme/schema/route";
import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";

function password(): string {
  return `Pw-${randomBytes(18).toString("base64url")}`;
}

function cookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies
    .map((value) => value.split(";", 1)[0])
    .filter((value) => value.includes("="))
    .join("; ");
}

function request(path: string, cookie: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  if (cookie) {
    headers.set("cookie", cookie);
  }
  headers.set("x-user-id", "forged-user");
  headers.set("x-organization-id", "forged-org");
  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}

describe("retired reporting routes", () => {
  it("rejects anonymous access, refuses owned legacy writes, and hides foreign periods", async () => {
    const anonymous = await getSchema(request("/api/vsme/schema", ""));
    assert.equal(anonymous.status, 401);

    const secret = password();
    const email = `vs08-${randomUUID()}@example.com`;
    const organization = await prisma.organization.create({ data: { name: "VS-08 organisation" } });
    const other = await prisma.organization.create({ data: { name: "VS-08 other" } });
    const user = await provisionCredentialUser({
      email,
      password: secret,
      name: "VS-08",
      organizationId: organization.id,
    });
    const company = await prisma.company.create({
      data: { name: "VS-08 company", organizationId: organization.id, currency: "SEK" },
    });
    const foreignCompany = await prisma.company.create({
      data: { name: "VS-08 foreign", organizationId: other.id, currency: "SEK" },
    });
    const period = await prisma.reportingPeriod.create({
      data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
    });
    const foreignPeriod = await prisma.reportingPeriod.create({
      data: { year: 2026, companyId: foreignCompany.id, schemaVersion: "2.0.0" },
    });
    try {
      const signedIn = await auth.api.signInEmail({
        body: { email, password: secret },
        asResponse: true,
      });
      const cookie = cookieHeader(signedIn);
      const schema = await getSchema(request("/api/vsme/schema", cookie));
      assert.equal(schema.status, 410);
      assert.equal((await schema.text()).includes("B1_MODULE_SELECTION"), false);

      const created = await postPeriod(
        request("/api/reporting-period", cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ companyId: company.id, year: 2038, status: "draft" }),
        }),
      );
      assert.equal(created.status, 201);
      const createdBody = (await created.json()) as { data: { id: string; vs2026ReportingOption: string | null } };
      assert.equal(createdBody.data.vs2026ReportingOption, null);

      const before = await prisma.sustainabilityDataPoint.count({ where: { reportingPeriodId: period.id } });
      const write = await postDataPoint(
        request("/api/data-point", cookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reportingPeriodId: period.id,
            dataPoints: [{ fieldId: "B1_LEGAL_FORM", value: "Should not be stored" }],
          }),
        }),
      );
      assert.equal(write.status, 410);
      assert.equal(await prisma.sustainabilityDataPoint.count({ where: { reportingPeriodId: period.id } }), before);

      const ownExport = await getExportJson(request(`/api/reporting-period/${period.id}/export/json`, cookie), {
        params: Promise.resolve({ id: period.id }),
      });
      assert.equal(ownExport.status, 410);
      const foreignExport = await getExportJson(
        request(`/api/reporting-period/${foreignPeriod.id}/export/json`, cookie),
        { params: Promise.resolve({ id: foreignPeriod.id }) },
      );
      assert.equal(foreignExport.status, 404);
      await prisma.reportingPeriod.deleteMany({ where: { id: createdBody.data.id } });
    } finally {
      await prisma.reportingPeriod.deleteMany({ where: { id: { in: [period.id, foreignPeriod.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [company.id, foreignCompany.id] } } });
      await prisma.session.deleteMany({ where: { userId: user.userId } });
      await prisma.account.deleteMany({ where: { userId: user.userId } });
      await prisma.user.deleteMany({ where: { id: user.userId } });
      await prisma.organization.deleteMany({ where: { id: { in: [organization.id, other.id] } } });
    }
  });
});
