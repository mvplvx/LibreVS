#!/usr/bin/env node
/**
 * LibreVS backend regression audit script.
 * Usage: node scripts/backend-audit.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function isJsonResponse(res, body) {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return false;
  if (typeof body !== "object" || body === null) return false;
  return typeof body.success === "boolean";
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, options);
  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { res, body, url };
}

async function dbChecks() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const orphans = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "SustainabilityDataPoint" dp
      LEFT JOIN "ReportingPeriod" rp ON dp."reportingPeriodId" = rp.id
      WHERE rp.id IS NULL
    `;
    record(
      "DB: no orphan SustainabilityDataPoint rows",
      orphans[0].count === 0,
      `orphans=${orphans[0].count}`
    );

    const orphanPeriods = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "ReportingPeriod" rp
      LEFT JOIN "Company" c ON rp."companyId" = c.id
      WHERE c.id IS NULL
    `;
    record(
      "DB: no orphan ReportingPeriod rows",
      orphanPeriods[0].count === 0,
      `orphans=${orphanPeriods[0].count}`
    );

    const period = await prisma.reportingPeriod.findFirst({
      include: { company: true, sustainabilityDataPoints: true },
    });
    record("DB: at least one reporting period exists", !!period);

    return period;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(`\nLibreVS Backend Audit — ${BASE}\n`);

  let periodId = null;
  let companyId = null;

  try {
    const period = await dbChecks();
    periodId = period?.id ?? null;
    companyId = period?.companyId ?? null;
  } catch (e) {
    record("DB connectivity", false, String(e.message));
  }

  // --- GET /api/reporting-period ---
  {
    const { res, body } = await request("/api/reporting-period");
    record(
      "GET /api/reporting-period — JSON + success",
      res.status === 200 && isJsonResponse(res, body) && body.success === true,
      `status=${res.status}`
    );
  }

  // --- POST /api/reporting-period invalid JSON ---
  {
    const { res, body } = await request("/api/reporting-period", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    record(
      "POST /api/reporting-period — invalid JSON → 400 JSON",
      res.status === 400 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  // --- POST /api/reporting-period missing fields ---
  {
    const { res, body } = await request("/api/reporting-period", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    record(
      "POST /api/reporting-period — invalid body → 400 JSON",
      res.status === 400 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  // --- GET /api/data-point missing param ---
  {
    const { res, body } = await request("/api/data-point");
    record(
      "GET /api/data-point — missing param → 400 JSON",
      res.status === 400 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  // --- GET /api/data-point invalid period ---
  {
    const { res, body } = await request(
      "/api/data-point?reportingPeriodId=nonexistent-period-id"
    );
    record(
      "GET /api/data-point — invalid period → 404 JSON",
      res.status === 404 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  if (periodId) {
    const { res, body } = await request(
      `/api/data-point?reportingPeriodId=${periodId}`
    );
    record(
      "GET /api/data-point — valid period → 200 JSON",
      res.status === 200 && isJsonResponse(res, body) && body.success === true,
      `status=${res.status}`
    );
  }

  // --- POST /api/data-point ---
  {
    const { res, body } = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportingPeriodId: "x", dataPoints: [] }),
    });
    record(
      "POST /api/data-point — empty array → 400 JSON",
      res.status === 400 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  if (periodId) {
    const { res, body } = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportingPeriodId: "nonexistent-period-id",
        dataPoints: [{ fieldId: "B3_ELECTRICITY_RENEWABLE", value: "10", unit: "MWh" }],
      }),
    });
    record(
      "POST /api/data-point — invalid period → 404 JSON",
      res.status === 404 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  const fakeId = "000000000000000000000000";
  for (const path of [
    `/api/reporting-period/${fakeId}/summary`,
    `/api/reporting-period/${fakeId}/kpis`,
  ]) {
    const { res, body } = await request(path);
    record(
      `GET ${path} — not found → 404 JSON`,
      res.status === 404 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  if (periodId) {
    const { res, body } = await request(
      `/api/reporting-period/${periodId}/summary`
    );
    const ok =
      res.status === 200 &&
      isJsonResponse(res, body) &&
      body.success === true &&
      typeof body.data?.summary === "object" &&
      typeof body.data?.totalDataPoints === "number";
    record("GET /api/reporting-period/[id]/summary — 200 + shape", ok, `status=${res.status}`);

    const { res: kRes, body: kBody } = await request(
      `/api/reporting-period/${periodId}/kpis`
    );
    const kOk =
      kRes.status === 200 &&
      isJsonResponse(kRes, kBody) &&
      kBody.success === true &&
      typeof kBody.data?.kpis?.energy === "number" &&
      typeof kBody.data?.kpis?.emissions === "number" &&
      typeof kBody.data?.kpis?.waste === "number" &&
      kBody.data.kpis.energy !== undefined &&
      typeof kBody.data.completenessScore === "number";
    record("GET /api/reporting-period/[id]/kpis — 200 + KPI defaults", kOk, `status=${kRes.status}`);
  }

  // Duplicate insert (unique constraint)
  if (periodId) {
    const payload = {
      reportingPeriodId: periodId,
      dataPoints: [{ fieldId: "B3_ELECTRICITY_RENEWABLE", value: "1", unit: "MWh" }],
    };
    await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { res, body } = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    record(
      "POST /api/data-point — duplicate → 409 JSON",
      res.status === 409 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status} error=${body.error}`
    );
  }

  // Bulk insert uses unique VSME fieldIds (sample from B1 identification)
  if (periodId) {
    const sampleFieldIds = [
      "B1_IDENTIFICATION_LEGAL_NAME",
      "B1_IDENTIFICATION_TRADING_NAME",
      "B1_IDENTIFICATION_REGISTRATION_NUMBER",
      "B1_REPORTING_REPORTING_PERIOD_START",
      "B1_CONTACT_PRIMARY_CONTACT_NAME",
      "B3_ELECTRICITY_RENEWABLE",
      "B3_ELECTRICITY_TOTAL",
      "B4_SCOPE1_TOTAL",
      "B5_WITHDRAWAL_TOTAL",
      "B6_WASTE_GENERATED_TOTAL",
    ];
    const bulk = {
      reportingPeriodId: periodId,
      dataPoints: sampleFieldIds.map((fieldId, i) => ({
        fieldId,
        value: String(i + 1),
      })),
    };
    const t0 = Date.now();
    const { res, body } = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulk),
    });
    const ms = Date.now() - t0;
    record(
      "POST /api/data-point — 100 bulk insert",
      res.status === 201 && body.success === true && body.data?.created === 100,
      `status=${res.status} ${ms}ms`
    );
  }

  // Non-JSON route (should 404 JSON from Next or HTML - check unknown)
  {
    const { res, body } = await request("/api/does-not-exist");
    const notHtml = !(body._raw && body._raw.includes("<!DOCTYPE"));
    record(
      "Unknown route — not HTML crash page",
      notHtml || res.status === 404,
      `status=${res.status}`
    );
  }

  if (periodId) {
    const { res: kRes, body: kBody } = await request(
      `/api/reporting-period/${periodId}/kpis`
    );
    const { res: eRes, body: eBody } = await request(
      `/api/reporting-period/${periodId}/esg-score`
    );
    const kCov = kBody.data?.vsme?.coveragePercentage;
    const eCov = eBody.data?.coveragePercentage;
    record(
      "KPI vs ESG coverage match (VSME Phase 4)",
      kRes.status === 200 &&
        eRes.status === 200 &&
        kCov === eCov,
      `kpi=${kCov} esg=${eCov}`
    );

    const { res: pRes } = await request("/api/portfolio/compare?companyIds=x");
    record(
      "Portfolio compare disabled (404)",
      pRes.status === 404,
      `status=${pRes.status}`
    );
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
