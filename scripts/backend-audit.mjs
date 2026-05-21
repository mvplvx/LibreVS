#!/usr/bin/env node
/**
 * LibreVS backend regression audit (VSME Phase 4 stabilization).
 * Usage: node scripts/backend-audit.mjs [baseUrl]
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

    const period = await prisma.reportingPeriod.findFirst({
      include: { company: true },
    });
    record("DB: at least one reporting period exists", !!period);

    if (period) {
      record(
        "DB: reporting period has schemaVersion",
        typeof period.schemaVersion === "string" && period.schemaVersion.length > 0,
        `schemaVersion=${period.schemaVersion}`
      );
    }

    const portfolioTable = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'PortfolioView'
    `;
    record(
      "DB: PortfolioView table removed",
      portfolioTable[0].count === 0,
      `exists=${portfolioTable[0].count}`
    );

    return period;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log(`\nLibreVS Backend Audit — ${BASE}\n`);

  let periodId = null;

  try {
    const period = await dbChecks();
    periodId = period?.id ?? null;
  } catch (e) {
    record("DB connectivity", false, String(e.message));
  }

  {
    const { res, body } = await request("/api/vsme/schema");
    record(
      "GET /api/vsme/schema — registry metadata",
      res.status === 200 &&
        isJsonResponse(res, body) &&
        body.success === true &&
        typeof body.data?.fieldCount === "number",
      `status=${res.status}`
    );
  }

  {
    const { res, body } = await request("/api/vsme/ui-schema?employeeCount=600");
    const section = body.data?.sections?.[0];
    record(
      "GET /api/vsme/ui-schema — applicability contract",
      res.status === 200 &&
        isJsonResponse(res, body) &&
        body.success === true &&
        section?.applicability?.moduleInReportingScope !== undefined &&
        section?.subsections?.[0]?.fields?.[0]?.applicability?.requiredToFill !==
          undefined &&
        section?.subsections?.[0]?.fields?.[0]?.type !== undefined,
      `status=${res.status}`
    );
  }

  {
    const { res, body } = await request("/api/vsme/applicability?employeeCount=600");
    record(
      "GET /api/vsme/applicability — comprehensive required",
      res.status === 200 &&
        body.data?.moduleCInReportingScope === true,
      `status=${res.status}`
    );
  }

  if (periodId) {
    const { res: kRes, body: kBody } = await request(
      `/api/reporting-period/${periodId}/kpis`
    );
    record(
      "GET /api/reporting-period/[id]/kpis — completeness metrics",
      kRes.status === 200 &&
        isJsonResponse(kRes, kBody) &&
        typeof kBody.data?.requiredCoveragePercentage === "number" &&
        typeof kBody.data?.completeness?.requiredFieldIds !== "undefined" &&
        typeof kBody.data?.exportReady === "boolean",
      `required=${kBody.data?.requiredCoveragePercentage}%`
    );

    const { res: covRes, body: covBody } = await request(
      `/api/reporting-period/${periodId}/vsme-coverage`
    );
    record(
      "GET /api/reporting-period/[id]/vsme-coverage — 200",
      covRes.status === 200 && isJsonResponse(covRes, covBody),
      `status=${covRes.status}`
    );

    const { res: oldRes } = await request(
      `/api/reporting-period/${periodId}/esg-score`
    );
    record(
      "GET /api/reporting-period/[id]/esg-score — removed (404)",
      oldRes.status === 404,
      `status=${oldRes.status}`
    );

    if (kBody?.success && covBody?.data) {
      const kRequired = kBody.data.requiredCoveragePercentage;
      const cRequired = covBody.data.requiredCoveragePercentage;
      record(
        "KPI vs vsme-coverage required % match",
        kRequired === cRequired,
        `kpis=${kRequired} coverage=${cRequired}`
      );
    }

    const { res: expRes, body: expBody } = await request(
      `/api/reporting-period/${periodId}/export`
    );
    const row = expBody.data?.rows?.[0];
    record(
      "GET /api/reporting-period/[id]/export — fieldId→excelCell",
      expRes.status === 200 &&
        (expBody.data?.rows?.length === 0 ||
          (row?.fieldId && row?.excelCell)),
      `rows=${expBody.data?.rows?.length ?? 0} exportReady=${expBody.data?.exportReady}`
    );
  }

  if (periodId) {
    const upsertPayload = {
      reportingPeriodId: periodId,
      dataPoints: [
        { fieldId: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH", value: "42", unit: "MWh" },
      ],
    };
    const first = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upsertPayload),
    });
    const second = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportingPeriodId: periodId,
        dataPoints: [
          { fieldId: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH", value: "99", unit: "MWh" },
        ],
      }),
    });
    record(
      "POST /api/data-point — upsert (200, updated≥1)",
      first.res.status === 200 &&
        second.res.status === 200 &&
        second.body.success === true &&
        (second.body.data?.updated >= 1 || second.body.data?.upserted >= 1),
      `first=${first.res.status} second updated=${second.body.data?.updated}`
    );

    const badUnit = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportingPeriodId: periodId,
        dataPoints: [
          { fieldId: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH", value: "1", unit: "kWh" },
        ],
      }),
    });
    record(
      "POST /api/data-point — wrong unit → 400",
      badUnit.res.status === 400 && badUnit.body.success === false,
      `status=${badUnit.res.status}`
    );

    const badType = await request("/api/data-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportingPeriodId: periodId,
        dataPoints: [
          { fieldId: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH", value: "not-a-number", unit: "MWh" },
        ],
      }),
    });
    record(
      "POST /api/data-point — invalid number → 400",
      badType.res.status === 400 && badType.body.success === false,
      `status=${badType.res.status}`
    );
  }

  const fakeId = "000000000000000000000000";
  for (const path of [
    `/api/reporting-period/${fakeId}/summary`,
    `/api/reporting-period/${fakeId}/vsme-coverage`,
  ]) {
    const { res, body } = await request(path);
    record(
      `GET ${path} — not found → 404 JSON`,
      res.status === 404 && isJsonResponse(res, body) && body.success === false,
      `status=${res.status}`
    );
  }

  {
    const { res } = await request("/api/portfolio/compare?companyIds=x");
    record("Portfolio compare route removed (404)", res.status === 404, `status=${res.status}`);
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
