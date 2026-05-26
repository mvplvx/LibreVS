/** Human-readable startup validation messages (no secrets). */

export const STARTUP_HELP = {
  missingDatabaseUrl:
    "DATABASE_URL is not set. Copy .env.example to .env and configure a PostgreSQL connection string.",
  databaseUnreachable:
    "Cannot reach PostgreSQL. Verify the database is running and DATABASE_URL host, port, and credentials are correct.",
  schemaMismatch:
    "Application schema version does not match the expected VSME 2.0.0 registry. Use a matching LibreVS release and run migrations.",
  registryInvalid:
    "VSME field registry failed validation. Ensure the repository is complete (264 fields) and dependencies are installed.",
} as const;

export function formatStartupFailure(errors: string[]): string {
  return [
    "",
    "╔══════════════════════════════════════════════════════════════╗",
    "║  LibreVS startup validation failed                           ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    ...errors.map((e) => `  • ${e}`),
    "",
    "  See docs/INSTALL.md for setup and docs/RC1.md for release checks.",
    "",
  ].join("\n");
}
