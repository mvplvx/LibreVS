import { prisma } from "@/lib/db/prisma";
import { validateRegistryAtRuntime } from "@/lib/system/registryHealth";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import { formatStartupFailure, STARTUP_HELP } from "./startupMessages";

export type StartupValidationResult = {
  ok: boolean;
  databaseReachable: boolean;
  schemaVersion: string;
  registryOk: boolean;
  errors: string[];
  warnings: string[];
};

const REQUIRED_ENV = ["DATABASE_URL"] as const;

export async function validateStartup(): Promise<StartupValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]?.trim()) {
      errors.push(
        key === "DATABASE_URL"
          ? STARTUP_HELP.missingDatabaseUrl
          : `${key} is not set`
      );
    }
  }

  let databaseReachable = false;
  if (process.env.DATABASE_URL?.trim()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch {
      errors.push(STARTUP_HELP.databaseUnreachable);
    }
  }

  if (VSME_SCHEMA_VERSION !== "2.0.0") {
    errors.push(`${STARTUP_HELP.schemaMismatch} (got ${VSME_SCHEMA_VERSION})`);
  }

  const registry = validateRegistryAtRuntime();
  if (!registry.ok) {
    errors.push(STARTUP_HELP.registryInvalid);
    errors.push(...registry.warnings);
  } else {
    warnings.push(...registry.warnings);
  }

  const ok = errors.length === 0;

  if (!ok) {
    const formatted = formatStartupFailure(errors);
    if (process.env.NODE_ENV === "production") {
      console.error(formatted);
    } else {
      throw new Error(formatted);
    }
  } else if (process.env.NODE_ENV === "development") {
    console.info(
      `[LibreVS] Startup OK — ${VSME_SCHEMA_VERSION}, registry ${registry.fieldCount} fields, database ${databaseReachable ? "connected" : "unknown"}`
    );
  }

  return {
    ok,
    databaseReachable,
    schemaVersion: VSME_SCHEMA_VERSION,
    registryOk: registry.ok,
    errors,
    warnings,
  };
}
