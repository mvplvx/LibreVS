import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getLibreVsBuildInfo } from "@/lib/constants/librevsRelease";
import { LIBREVS_VERSION } from "@/lib/constants/librevsCommunity";
import { isLegacyStoredRow } from "@/lib/vsme/runtime/dataTruthMode";
import { validateRegistryAtRuntime } from "@/lib/system/registryHealth";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";

/** Read-only runtime diagnostics (no mutations, no secrets). */
export async function GET() {
  return withApiHandler(async () => {
    const registry = validateRegistryAtRuntime();
    const build = getLibreVsBuildInfo();

    let databaseReachable = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }

    let legacyFieldsDetected = false;
    if (databaseReachable) {
      try {
        const sample = await prisma.sustainabilityDataPoint.findMany({
          select: {
            fieldId: true,
            legacyFieldId: true,
            migrationStatus: true,
          },
          take: 2000,
        });
        legacyFieldsDetected = sample.some((row) => isLegacyStoredRow(row));
      } catch {
        legacyFieldsDetected = false;
      }
    }

    const status =
      registry.ok &&
      VSME_SCHEMA_VERSION === "2.0.0" &&
      databaseReachable &&
      !legacyFieldsDetected
        ? "ok"
        : registry.ok && databaseReachable
          ? "degraded"
          : "error";

    return apiSuccess({
      status,
      schemaVersion: VSME_SCHEMA_VERSION,
      releaseCandidate: build.releaseCandidate,
      appVersion: LIBREVS_VERSION,
      databaseReachable,
      registry: {
        fieldCount: registry.fieldCount,
        bSections: registry.bSections,
        cSections: registry.cSections,
        ok: registry.ok,
      },
      engines: {
        exportValidation: registry.ok && databaseReachable ? "loaded" : "degraded",
        materiality: registry.ok ? "loaded" : "degraded",
        reportingSnapshot: registry.ok ? "loaded" : "degraded",
      },
      legacyFieldsDetected,
      warnings: registry.warnings,
    });
  });
}
