import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { GET as getCompanies, POST as postCompany } from "../app/api/company/route";
import { GET as getDataPoints } from "../app/api/data-point/route";
import { GET as getExport } from "../app/api/reporting-period/[id]/export/route";
import { auth, requireAuthenticatedUser } from "./auth";
import { provisionCredentialUser, resetCredentialPassword } from "./auth-provision";
import { prisma } from "./db/prisma";
import { getVS2026RegulatoryPreview } from "./vsme/vs2026/regulatoryPreview";

const created = {
  organizationIds: [] as string[],
  userIds: [] as string[],
  companyIds: [] as string[],
  periodIds: [] as string[],
};

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

async function signIn(email: string, secret: string): Promise<Response> {
  return auth.api.signInEmail({
    body: { email, password: secret },
    asResponse: true,
  });
}

async function cleanup(): Promise<void> {
  if (created.periodIds.length > 0) {
    await prisma.sustainabilityDataPoint.deleteMany({
      where: { reportingPeriodId: { in: created.periodIds } },
    });
    await prisma.reportingPeriod.deleteMany({
      where: { id: { in: created.periodIds } },
    });
  }
  if (created.companyIds.length > 0) {
    await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } });
  }
  if (created.organizationIds.length > 0 || created.userIds.length > 0) {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: created.userIds } },
          { organizationId: { in: created.organizationIds } },
        ],
      },
    });
  }
  if (created.organizationIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: created.organizationIds } } });
  }
}

describe("authentication and tenant isolation", () => {
  it("rejects missing, forged, expired, and revoked sessions, and isolates organisations", async () => {
    const secretA = password();
    const secretB = password();
    const emailA = `sec01-a-${randomUUID()}@example.com`;
    const emailB = `sec01-b-${randomUUID()}@example.com`;
    try {
      const organizationA = await prisma.organization.create({
        data: { name: "SEC-01 organisation A" },
      });
      const organizationB = await prisma.organization.create({
        data: { name: "SEC-01 organisation B" },
      });
      created.organizationIds.push(organizationA.id, organizationB.id);

      const userA = await provisionCredentialUser({
        email: emailA,
        password: secretA,
        name: "Security A",
        organizationId: organizationA.id,
      });
      const userB = await provisionCredentialUser({
        email: emailB,
        password: secretB,
        name: "Security B",
        organizationId: organizationB.id,
      });
      created.userIds.push(userA.userId, userB.userId);

      const companyA = await prisma.company.create({
        data: { name: "SEC-01 company A", organizationId: organizationA.id, currency: "EUR" },
      });
      const companyB = await prisma.company.create({
        data: { name: "SEC-01 company B", organizationId: organizationB.id, currency: "EUR" },
      });
      created.companyIds.push(companyA.id, companyB.id);
      const periodA = await prisma.reportingPeriod.create({
        data: { year: 2031, companyId: companyA.id, schemaVersion: "2.0.0" },
      });
      const periodB = await prisma.reportingPeriod.create({
        data: { year: 2031, companyId: companyB.id, schemaVersion: "2.0.0" },
      });
      created.periodIds.push(periodA.id, periodB.id);
      await prisma.sustainabilityDataPoint.create({
        data: { reportingPeriodId: periodA.id, fieldId: "B1_TURNOVER", value: "0" },
      });
      const site = await prisma.vs2026RepeatingRow.create({
        data: {
          reportingPeriodId: periodA.id,
          groupId: "B1_SITE",
          position: 0,
          values: {
            create: [{ datapointId: "B1_SITE_IDENTIFIER", value: "SEC01-SITE-SECRET" }],
          },
        },
      });

      const missing = await getCompanies(request("/api/company", ""));
      assert.equal(missing.status, 401);
      const forgedOnly = await getCompanies(
        new Request("http://localhost:3000/api/company", {
          headers: {
            "x-user-id": userA.userId,
            "x-organization-id": organizationA.id,
          },
        }),
      );
      assert.equal(forgedOnly.status, 401);
      assert.equal((await forgedOnly.text()).includes(companyA.name), false);

      const unknown = await signIn(`missing-${randomUUID()}@example.com`, password());
      const wrong = await signIn(emailA, password());
      assert.equal(unknown.status, wrong.status);
      assert.equal(unknown.status, 401);
      const unknownBody = await unknown.json() as { message?: string };
      const wrongBody = await wrong.json() as { message?: string };
      assert.equal(unknownBody.message, wrongBody.message);
      assert.equal(JSON.stringify(unknownBody).includes(emailA), false);

      const signedIn = await signIn(emailA, secretA);
      assert.equal(signedIn.status, 200);
      const sessionCookie = cookieHeader(signedIn);
      const setCookie = signedIn.headers.get("set-cookie") ?? "";
      assert.match(setCookie, /httponly/i);
      assert.match(setCookie, /samesite=lax/i);
      assert.equal(/;\s*secure/i.test(setCookie), process.env.NODE_ENV === "production");
      assert.equal(setCookie.includes(userA.userId), false);
      assert.equal(setCookie.includes(emailA), false);

      const context = await requireAuthenticatedUser(
        request("/api/company", sessionCookie),
      );
      assert.deepEqual(context, {
        userId: userA.userId,
        organizationId: organizationA.id,
      });

      const companies = await getCompanies(request("/api/company", sessionCookie));
      assert.equal(companies.status, 200);
      const companyBody = await companies.text();
      assert.equal(companyBody.includes(companyA.name), true);
      assert.equal(companyBody.includes(companyB.name), false);

      const createdCompany = await postCompany(
        request("/api/company", sessionCookie, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "SEC-01 created by A",
            organizationId: organizationB.id,
          }),
        }),
      );
      assert.equal(createdCompany.status, 201);
      const createdBody = await createdCompany.json() as { data: { id: string; organizationId: string } };
      created.companyIds.push(createdBody.data.id);
      assert.equal(createdBody.data.organizationId, organizationA.id);

      const signedInB = await signIn(emailB, secretB);
      const cookieB = cookieHeader(signedInB);
      const foreignCompanies = await getCompanies(request("/api/company", cookieB));
      const foreignCompanyText = await foreignCompanies.text();
      assert.equal(foreignCompanyText.includes(companyA.name), false);
      assert.equal(foreignCompanyText.includes("SEC-01 created by A"), false);

      const ownPoints = await getDataPoints(
        request(`/api/data-point?reportingPeriodId=${periodA.id}`, sessionCookie),
      );
      assert.equal(ownPoints.status, 410);
      assert.equal((await ownPoints.text()).includes("SEC01-SITE-SECRET"), false);
      const foreignPoints = await getDataPoints(
        request(`/api/data-point?reportingPeriodId=${periodA.id}`, cookieB),
      );
      assert.equal(foreignPoints.status, 404);
      const guessedPoints = await getDataPoints(
        request("/api/data-point?reportingPeriodId=guessed-period", sessionCookie),
      );
      assert.equal(guessedPoints.status, 404);

      const foreignExport = await getExport(
        request(`/api/reporting-period/${periodA.id}/export`, cookieB),
        { params: Promise.resolve({ id: periodA.id }) },
      );
      assert.equal(foreignExport.status, 404);
      assert.equal((await foreignExport.text()).includes("SEC01-SITE-SECRET"), false);

      const ownPreview = await getVS2026RegulatoryPreview({
        reportingPeriodId: periodA.id,
        request: request(`/vsme/vs2026/preview/${periodA.id}`, sessionCookie),
        db: prisma,
        isEnabled: () => true,
      });
      assert.equal(ownPreview.ok, true);
      if (ownPreview.ok) {
        assert.equal(
          ownPreview.view.repeatingRows.some((row) => row.rowId === site.id),
          true,
        );
      }
      const foreignPreview = await getVS2026RegulatoryPreview({
        reportingPeriodId: periodA.id,
        request: request(`/vsme/vs2026/preview/${periodA.id}`, cookieB),
        db: prisma,
        isEnabled: () => true,
      });
      assert.equal(foreignPreview.ok, false);
      if (!foreignPreview.ok) {
        assert.equal(foreignPreview.reason, "PERIOD_NOT_FOUND");
        assert.equal(JSON.stringify(foreignPreview).includes("SEC01-SITE-SECRET"), false);
      }
      const disabledPreview = await getVS2026RegulatoryPreview({
        reportingPeriodId: periodA.id,
        request: request(`/vsme/vs2026/preview/${periodA.id}`, sessionCookie),
        db: prisma,
        isEnabled: () => false,
      });
      assert.equal(disabledPreview.ok, false);
      if (!disabledPreview.ok) {
        assert.equal(disabledPreview.reason, "PREVIEW_DISABLED");
      }

      await prisma.user.update({
        where: { id: userA.userId },
        data: { organizationId: organizationB.id },
      });
      const moved = await requireAuthenticatedUser(request("/api/company", sessionCookie));
      assert.equal(moved?.organizationId, organizationB.id);
      await prisma.user.update({
        where: { id: userA.userId },
        data: { organizationId: organizationA.id, active: false },
      });
      assert.equal(
        await requireAuthenticatedUser(request("/api/company", sessionCookie)),
        null,
      );
      const inactive = await getCompanies(request("/api/company", sessionCookie));
      assert.equal(inactive.status, 401);
      await prisma.user.update({
        where: { id: userA.userId },
        data: { active: true },
      });

      await prisma.session.updateMany({
        where: { userId: userA.userId },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });
      assert.equal(
        await requireAuthenticatedUser(request("/api/company", sessionCookie)),
        null,
      );
      await prisma.session.updateMany({
        where: { userId: userA.userId },
        data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await prisma.session.deleteMany({ where: { userId: userA.userId } });
      const revoked = await getCompanies(request("/api/company", sessionCookie));
      assert.equal(revoked.status, 401);

      const again = await signIn(emailA, secretA);
      const freshCookie = cookieHeader(again);
      await auth.api.signOut({
        headers: new Headers({ cookie: freshCookie }),
      });
      const reused = await getCompanies(request("/api/company", freshCookie));
      assert.equal(reused.status, 401);

      const invalid = await getCompanies(
        request("/api/company", "better-auth.session_token=not-a-session"),
      );
      assert.equal(invalid.status, 401);
    } finally {
      await cleanup();
    }
  });

  it("revokes sessions when an administrator resets the password", async () => {
    const secret = password();
    const replacement = password();
    const email = `sec01-reset-${randomUUID()}@example.com`;
    try {
      const organization = await prisma.organization.create({
        data: { name: "SEC-01 password reset" },
      });
      created.organizationIds.push(organization.id);
      const user = await provisionCredentialUser({
        email,
        password: secret,
        name: "Reset user",
        organizationId: organization.id,
      });
      created.userIds.push(user.userId);
      const signedIn = await signIn(email, secret);
      const cookie = cookieHeader(signedIn);
      assert.ok(await requireAuthenticatedUser(request("/api/company", cookie)));
      await resetCredentialPassword({
        email,
        password: replacement,
        organizationId: organization.id,
      });
      assert.equal(await requireAuthenticatedUser(request("/api/company", cookie)), null);
      const again = await signIn(email, replacement);
      assert.equal(again.status, 200);
      const oldPassword = await signIn(email, secret);
      assert.equal(oldPassword.status, 401);
    } finally {
      await cleanup();
    }
  });

  it("rejects a cross-site sign-in and repeated failures", async () => {
    const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const signup = await auth.handler(
      new Request(`${origin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin,
        },
        body: JSON.stringify({
          email: "new-person@example.com",
          password: password(),
          name: "New person",
        }),
      }),
    );
    assert.equal(signup.status === 200, false);
    const crossSite = await auth.handler(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        body: JSON.stringify({
          email: "person@example.com",
          password: password(),
        }),
      }),
    );
    assert.equal(crossSite.status, 403);

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await auth.handler(
        new Request(`${origin}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin,
          },
          body: JSON.stringify({
            email: "nobody@example.com",
            password: password(),
          }),
        }),
      );
      statuses.push(response.status);
    }
    assert.equal(statuses[0] === 429, false);
    assert.equal(statuses.includes(429), true);
  });
});
