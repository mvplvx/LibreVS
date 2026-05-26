/**
 * Phase 8 RC1 — release candidate smoke test.
 * Usage: npx tsx scripts/phase8-smoke-check.ts
 */
import { execSync } from "node:child_process";

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
  console.log("Phase 8 RC1 smoke check");
  console.log(`Base: ${BASE}\n`);

  // Prior phase checks (non-fatal on readiness red)
  try {
    execSync("npx tsx scripts/phase7b-smoke-check.ts", {
      stdio: "inherit",
      env: { ...process.env, LIBREVS_BASE_URL: BASE },
    });
  } catch {
    fail("phase7b-smoke-check failed");
  }

  console.log("\nRC1-specific checks:");

  const versionRes = await fetchJson<{
    version: string;
    releaseCandidate: string;
    schemaVersion: string;
  }>("/api/librevs/version");
  if (versionRes.status !== 200 || !versionRes.body.success) {
    fail("/api/librevs/version failed");
  }
  if (versionRes.body.data?.releaseCandidate !== "RC1") {
    fail(`Expected RC1, got ${versionRes.body.data?.releaseCandidate}`);
  }
  if (versionRes.body.data?.schemaVersion !== "2.0.0") {
    fail("schemaVersion must be 2.0.0");
  }
  ok(`Version API (RC1, v${versionRes.body.data?.version})`);

  const healthRes = await fetchJson<{
    status: string;
    databaseReachable: boolean;
    registry: { fieldCount: number };
    engines: Record<string, string>;
  }>("/api/system-health");
  if (healthRes.status !== 200 || !healthRes.body.success) {
    fail("/api/system-health failed");
  }
  if (!healthRes.body.data?.databaseReachable) {
    fail("databaseReachable is false");
  }
  ok(`System health (${healthRes.body.data?.status}, DB up)`);

  const healthPage = await fetch(`${BASE}/system/health`);
  if (!healthPage.ok) {
    fail(`/system/health HTTP ${healthPage.status}`);
  }
  ok("/system/health page loads");

  const backupPage = await fetch(`${BASE}/system/backup`);
  if (!backupPage.ok) {
    fail(`/system/backup HTTP ${backupPage.status}`);
  }
  const backupHtml = await backupPage.text();
  if (!backupHtml.includes("pg_dump")) {
    fail("Backup page missing pg_dump guidance");
  }
  ok("/system/backup data safety page");

  const exportReview = await fetch(`${BASE}/vsme/export-review`);
  if (!exportReview.ok) {
    fail(`/vsme/export-review HTTP ${exportReview.status}`);
  }
  const reviewHtml = await exportReview.text();
  if (!reviewHtml.includes("legal advice")) {
    fail("Export disclaimer not found on export-review");
  }
  ok("Export disclaimer on export-review");

  const dash = await fetch(`${BASE}/dashboard`);
  if (!dash.ok) {
    fail(`/dashboard HTTP ${dash.status}`);
  }
  const dashHtml = await dash.text();
  if (!dashHtml.includes("stores reporting data locally")) {
    fail("Data ownership notice missing on dashboard");
  }
  ok("Data ownership notice on dashboard");

  const home = await fetch(`${BASE}/`);
  const homeHtml = await home.text();
  if (!homeHtml.includes("RC1") && !homeHtml.includes("Community Edition")) {
    fail("Homepage missing RC/edition branding in chrome");
  }
  ok("Homepage chrome branding");

  console.log("\nPhase 8 RC1 smoke check passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
