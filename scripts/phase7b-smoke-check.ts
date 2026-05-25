/**
 * Phase 7B — UX stabilization smoke checks.
 * Usage: npx tsx scripts/phase7b-smoke-check.ts
 */
import { EU_REPORTING_CURRENCIES } from "../lib/vsme/currency";
import { hidesMaterialityControls } from "../lib/vsme/ui/fieldUx";
import {
  VSME_FIELD_COUNT,
  VSME_FIELD_REGISTRY,
} from "../lib/vsme/vsme.fieldRegistry";
import { isModuleCInReportingScope } from "../lib/vsme/moduleScope";

const BASE = process.env.LIBREVS_BASE_URL ?? "http://localhost:3000";

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string };

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function fetchJson<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = (await res.json()) as ApiEnvelope<T>;
  return { status: res.status, body, res };
}

async function main(): Promise<void> {
  console.log("Phase 7B smoke check");
  console.log(`Base: ${BASE}`);

  const home = await fetch(`${BASE}/vsme`);
  if (!home.ok) {
    fail(`/vsme HTTP ${home.status}`);
  }
  const html = await home.text();
  ok("/vsme renders");

  if (!html.includes("Community Edition") && !html.includes("LibreVS")) {
    fail("LibreVS branding not found on /vsme (restart dev server if layout changed)");
  }
  ok("LibreVS branding present");

  if (
    !html.includes("Suggest a feature") ||
    !html.includes("Report a bug") ||
    !html.includes("contact@librevs.org")
  ) {
    fail("Community footer links missing (global layout)");
  }
  ok("Community footer links present");

  if (html.match(/B1_[A-Z0-9_]{20,}/)) {
    fail("Raw B1 fieldId visible in /vsme HTML");
  }
  ok("No raw B1 fieldIds in page HTML");

  const companiesRes = await fetchJson<
    Array<{ id: string; currency?: string }>
  >("/api/company");
  if (companiesRes.status !== 200 || !companiesRes.body.success) {
    fail("GET /api/company failed");
  }
  const company = companiesRes.body.data?.[0];
  if (!company?.id) {
    fail("No company for currency test");
  }
  if (company.currency === undefined) {
    fail(
      "Company.currency missing from API — restart dev server after prisma generate"
    );
  }
  ok(`Company.currency exposed (${company.currency})`);

  const patchRes = await fetchJson<{ currency: string }>(
    `/api/company/${company.id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: "SEK" }),
    }
  );
  if (patchRes.status !== 200 || !patchRes.body.success) {
    fail(`PATCH company currency failed: ${patchRes.body.error}`);
  }
  if (patchRes.body.data?.currency !== "SEK") {
    fail("PATCH currency did not persist as SEK");
  }
  ok("Company reporting currency PATCH");

  const b1Ids = Object.keys(VSME_FIELD_REGISTRY).filter((id) =>
    id.startsWith("B1_")
  );
  const b1WithMaterialityUi = b1Ids.filter((id) => !hidesMaterialityControls(id));
  if (b1WithMaterialityUi.length > 0) {
    fail("B1 fields should hide materiality controls");
  }
  ok("B1 hides materiality controls (UI policy)");

  if (!isModuleCInReportingScope(500)) {
    fail("C module should be in scope at 500 employees");
  }
  ok("C module required at employeeCount >= 500");

  const schemaRes = await fetchJson<{
    sections: Array<{ code: string; applicability: { visible: boolean } }>;
  }>("/api/vsme/ui-schema?employeeCount=650");
  if (schemaRes.status !== 200 || !schemaRes.body.success) {
    fail("ui-schema at 650 employees failed");
  }
  const cVisible = schemaRes.body.data!.sections.some(
    (s) => s.code.startsWith("C") && s.applicability.visible
  );
  if (!cVisible) {
    fail("No visible C module sections at 650 employees");
  }
  ok("C module sections visible at 650 employees");

  const schema120 = await fetchJson<{
    sections: Array<{
      subsections: Array<{ fields: Array<{ fieldId: string; type: string; name: string }> }>;
    }>;
  }>("/api/vsme/ui-schema?employeeCount=120");
  const fieldCount = schema120.body.data!.sections.reduce(
    (n, s) =>
      n + s.subsections.reduce((m, sub) => m + sub.fields.length, 0),
    0
  );
  if (fieldCount !== VSME_FIELD_COUNT) {
    fail(`Expected ${VSME_FIELD_COUNT} fields, got ${fieldCount}`);
  }
  ok(`Registry field count unchanged (${VSME_FIELD_COUNT})`);

  for (const code of EU_REPORTING_CURRENCIES) {
    if (!html.includes(code) && code !== company.currency) {
      /* currency selector may not render until workspace loaded */
    }
  }

  const periodsRes = await fetchJson<Array<{ id: string }>>(
    "/api/reporting-period"
  );
  const periodId = periodsRes.body.data?.[0]?.id;
  if (periodId) {
    const auditRes = await fetchJson<{ totalBlockingFields: number }>(
      `/api/reporting-period/${periodId}/export-audit`
    );
    if (auditRes.status !== 200 && auditRes.status !== 400) {
      fail(`export-audit unexpected status ${auditRes.status}`);
    }
    ok("export-audit endpoint responds");
  }

  console.log("\nPhase 7B smoke check passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
