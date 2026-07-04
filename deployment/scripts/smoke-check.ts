/**
 * Deployment Manager smoke check — verifies health contract against a running LibreVS instance.
 * Usage: LIBREVS_BASE_URL=http://localhost:3000 npm run deployment:smoke
 */
import { fetchSystemHealth, fetchVersion } from "../src/health.js";

const BASE = process.env.LIBREVS_BASE_URL ?? "http://localhost:3000";

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function main(): Promise<void> {
  console.log("Deployment Manager smoke check");
  console.log(`Base: ${BASE}\n`);

  const health = await fetchSystemHealth(BASE);
  if (!health.reachable) {
    fail(`Health endpoint unreachable: ${health.error ?? "unknown error"}`);
  }
  ok(`GET /api/system-health (${health.httpStatus})`);

  if (!health.data?.databaseReachable) {
    fail("databaseReachable is false");
  }
  ok(`Database reachable (status: ${health.data.status})`);

  if (health.data.schemaVersion !== "2.0.0") {
    fail(`Expected schemaVersion 2.0.0, got ${health.data.schemaVersion}`);
  }
  ok(`Schema version ${health.data.schemaVersion}`);

  const version = await fetchVersion(BASE);
  if (version) {
    ok(`LibreVS version ${version}`);
  }

  if (health.ready) {
    ok("LibreVS is ready (status: ok, database reachable)");
  } else {
    console.warn(
      `\n⚠ LibreVS responded but is not fully ready (status: ${health.data?.status})`
    );
  }

  console.log("\nDeployment Manager smoke check complete.\n");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
