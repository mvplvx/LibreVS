import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { isLegacyStoredRow } from "@/lib/vsme/runtime/dataTruthMode";
import { validateRegistryAtRuntime } from "@/lib/system/registryHealth";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";

/** Read-only runtime diagnostics (no mutations). */
export async function GET() {
  return withApiHandler(async () => {
    const registry = validateRegistryAtRuntime();

    let legacyFieldsDetected = false;
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

    const status =
      registry.ok && VSME_SCHEMA_VERSION === "2.0.0" && !legacyFieldsDetected
        ? "ok"
        : registry.ok
          ? "degraded"
          : "error";

    return apiSuccess({
      status,
      schemaVersion: VSME_SCHEMA_VERSION,
      registry: {
        fieldCount: registry.fieldCount,
        bSections: registry.bSections,
        cSections: registry.cSections,
      },
      legacyFieldsDetected,
      warnings: registry.warnings,
    });
  });
}
