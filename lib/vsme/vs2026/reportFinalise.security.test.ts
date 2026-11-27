import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { POST as postFinalise } from "../../../app/api/vsme/vs2026/report/[reportingPeriodId]/finalise/route";
import { GET as getDraft } from "../../../app/api/vsme/vs2026/report/[reportingPeriodId]/draft/route";
import { GET as getSnapshot } from "../../../app/api/vsme/vs2026/report/snapshot/[snapshotId]/route";
import { auth } from "../../auth";
import { provisionCredentialUser } from "../../auth-provision";
import { prisma } from "../../db/prisma";

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

function request(path: string, cookie: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  if (cookie) {
    headers.set("cookie", cookie);
  }
  headers.set("x-user-id", "forged-user");
  headers.set("x-organization-id", "forged-org");
  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}

describe("VS 2026 report download authorization", () => {
  it("rejects unauthenticated, inactive, expired, forged, and foreign access", async () => {
    const secret = password();
    const email = `vs07a-${randomUUID()}@example.com`;
    const organization = await prisma.organization.create({ data: { name: "VS-07A security organisation" } });
    const other = await prisma.organization.create({ data: { name: "VS-07A security other" } });
    const user = await provisionCredentialUser({
      email,
      password: secret,
      name: "VS-07A security",
      organizationId: organization.id,
    });
    const company = await prisma.company.create({
      data: { name: "VS-07A security company", organizationId: organization.id, currency: "EUR" },
    });
    const foreignCompany = await prisma.company.create({
      data: { name: "VS-07A foreign company", organizationId: other.id, currency: "EUR" },
    });
    const period = await prisma.reportingPeriod.create({
      data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
    });
    const foreignPeriod = await prisma.reportingPeriod.create({
      data: { year: 2026, companyId: foreignCompany.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
    });
    const snapshot = await prisma.vs2026ReportSnapshot.create({
      data: {
        reportingPeriodId: period.id,
        organizationId: organization.id,
        companyId: company.id,
        revision: 1,
        regulatoryVersion: "EU-2026/1560",
        reportingOption: "OPTION_A",
        dataset: { private: true },
        conformityStatement: "Undertaking declaration",
        contentHash: "abc",
        finalisedByUserId: user.userId,
        finalisedAt: new Date(),
      },
    });
    const foreignSnapshot = await prisma.vs2026ReportSnapshot.create({
      data: {
        reportingPeriodId: foreignPeriod.id,
        organizationId: other.id,
        companyId: foreignCompany.id,
        revision: 1,
        regulatoryVersion: "EU-2026/1560",
        reportingOption: "OPTION_A",
        dataset: { private: "foreign-report" },
        conformityStatement: "Foreign declaration",
        contentHash: "def",
        finalisedByUserId: "other-user",
        finalisedAt: new Date(),
      },
    });
    try {
      const anonymous = await postFinalise(
        request(`/api/vsme/vs2026/report/${period.id}/finalise`, "", {
          method: "POST",
          body: JSON.stringify({ confirmed: true, ready: true, conformityStatement: "Injected", finalisedByUserId: "attacker" }),
        }),
        { params: Promise.resolve({ reportingPeriodId: period.id }) },
      );
      assert.equal(anonymous.status, 401);
      assert.equal((await anonymous.text()).includes("Injected"), false);

      const signedIn = await auth.api.signInEmail({ body: { email, password: secret }, asResponse: true });
      assert.equal(signedIn.status, 200);
      const cookie = cookieHeader(signedIn);
      const forged = await postFinalise(
        request(`/api/vsme/vs2026/report/${foreignPeriod.id}/finalise`, cookie, {
          method: "POST",
          body: JSON.stringify({ confirmed: true, ready: true, conformityStatement: "Injected" }),
        }),
        { params: Promise.resolve({ reportingPeriodId: foreignPeriod.id }) },
      );
      assert.equal(forged.status, 404);
      const own = await postFinalise(
        request(`/api/vsme/vs2026/report/${period.id}/finalise`, cookie, {
          method: "POST",
          body: JSON.stringify({ confirmed: true, ready: true, conformityStatement: "Injected" }),
        }),
        { params: Promise.resolve({ reportingPeriodId: period.id }) },
      );
      assert.equal(own.status, 409);
      const ownBody = (await own.json()) as { code?: string; error?: string };
      assert.equal(ownBody.code, "EDITOR_DISABLED");
      assert.equal(await prisma.vs2026ReportSnapshot.count({ where: { reportingPeriodId: period.id } }), 1);

      const draft = await getDraft(request(`/api/vsme/vs2026/report/${foreignPeriod.id}/draft`, cookie), {
        params: Promise.resolve({ reportingPeriodId: foreignPeriod.id }),
      });
      assert.equal(draft.status, 404);
      assert.equal((await draft.text()).includes("foreign-report"), false);

      const guessed = await getSnapshot(request("/api/vsme/vs2026/report/snapshot/not-a-real-snapshot", cookie), {
        params: Promise.resolve({ snapshotId: "not-a-real-snapshot" }),
      });
      assert.equal(guessed.status, 404);
      const foreignDownload = await getSnapshot(request(`/api/vsme/vs2026/report/snapshot/${foreignSnapshot.id}`, cookie), {
        params: Promise.resolve({ snapshotId: foreignSnapshot.id }),
      });
      assert.equal(foreignDownload.status, 404);
      assert.equal((await foreignDownload.text()).includes("foreign-report"), false);
      const hidden = await getSnapshot(request(`/api/vsme/vs2026/report/snapshot/${snapshot.id}`, cookie), {
        params: Promise.resolve({ snapshotId: snapshot.id }),
      });
      assert.equal(hidden.status, 409);
      assert.equal(((await hidden.json()) as { code?: string }).code, "INTEGRITY_FAILURE");
      assert.equal(hidden.headers.get("cache-control"), "private, no-store");
      const unsupported = await getSnapshot(request(`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=xml`, cookie), {
        params: Promise.resolve({ snapshotId: snapshot.id }),
      });
      assert.equal(unsupported.status, 400);

      await prisma.user.update({ where: { id: user.userId }, data: { active: false } });
      const inactive = await postFinalise(
        request(`/api/vsme/vs2026/report/${period.id}/finalise`, cookie, {
          method: "POST",
          body: JSON.stringify({ confirmed: true }),
        }),
        { params: Promise.resolve({ reportingPeriodId: period.id }) },
      );
      assert.equal(inactive.status, 401);
      await prisma.user.update({ where: { id: user.userId }, data: { active: true } });
      await prisma.session.updateMany({
        where: { userId: user.userId },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      const expired = await getSnapshot(request(`/api/vsme/vs2026/report/snapshot/${snapshot.id}`, cookie), {
        params: Promise.resolve({ snapshotId: snapshot.id }),
      });
      assert.equal(expired.status, 401);
    } finally {
      await prisma.vs2026ReportSnapshot.deleteMany({
        where: { reportingPeriodId: { in: [period.id, foreignPeriod.id] } },
      });
      await prisma.reportingPeriod.deleteMany({ where: { id: { in: [period.id, foreignPeriod.id] } } });
      await prisma.company.deleteMany({ where: { id: { in: [company.id, foreignCompany.id] } } });
      await prisma.session.deleteMany({ where: { userId: user.userId } });
      await prisma.account.deleteMany({ where: { userId: user.userId } });
      await prisma.user.deleteMany({ where: { id: user.userId } });
      await prisma.organization.deleteMany({ where: { id: { in: [organization.id, other.id] } } });
    }
  });
});
