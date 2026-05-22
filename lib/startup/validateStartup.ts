import { prisma } from "@/lib/db/prisma";
import { validateRegistryAtRuntime } from "@/lib/system/registryHealth";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";

export type StartupValidationResult = {
  ok: boolean;
  databaseReachable: boolean;
  schemaVersion: string;
  registryOk: boolean;
  errors: string[];
  warnings: string[];
};

export async function validateStartup(): Promise<StartupValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push("DATABASE_URL is not set");
  }

  let databaseReachable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch (error) {
    errors.push(
      `Database unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (VSME_SCHEMA_VERSION !== "2.0.0") {
    errors.push(`schemaVersion must be 2.0.0 (got ${VSME_SCHEMA_VERSION})`);
  }

  const registry = validateRegistryAtRuntime();
  if (!registry.ok) {
    errors.push(...registry.warnings);
  } else {
    warnings.push(...registry.warnings);
  }

  const ok = errors.length === 0;

  if (!ok) {
    const message = `[LibreVS] Startup validation failed: ${errors.join("; ")}`;
    if (process.env.NODE_ENV === "production") {
      console.error(message);
    } else {
      throw new Error(message);
    }
  } else if (process.env.NODE_ENV === "development") {
    console.info(
      `[LibreVS] Startup OK — schema ${VSME_SCHEMA_VERSION}, registry ${registry.fieldCount} fields, DB ${databaseReachable ? "up" : "down"}`
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
