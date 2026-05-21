import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { VSME_FIELD_COUNT } from "@/lib/vsme/vsme.fieldRegistry";
import { runRegistryBootCheck } from "@/lib/vsme/registryBootCheck";
import { loadMaterialityForPeriod } from "@/lib/vsme/loadMateriality";
import { loadReportedFieldIds } from "@/lib/vsme/loadReportedFieldIds";
import { isModuleCInReportingScope } from "@/lib/vsme/moduleScope";
import { guardUiSchemaBuild } from "@/lib/vsme/dev/contractGuard";
import { buildVsmeUiSchema } from "@/lib/vsme/vsme.uiSchema";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import type { VsmeUiSchema } from "@/lib/vsme/vsme.uiSchema";

let devBootChecked = false;

function ensureDevBootCheck(): void {
  if (devBootChecked || process.env.NODE_ENV !== "development") {
    return;
  }
  devBootChecked = true;
  runRegistryBootCheck();
}

function emptyUiSchemaFallback(employeeCount: number): VsmeUiSchema {
  return {
    schemaVersion: VSME_SCHEMA_VERSION,
    templateVersion: "0.0.0",
    standard: "VSME",
    alignment: "EFRAG",
    employeeCount,
    moduleCInReportingScope: isModuleCInReportingScope(employeeCount),
    sections: [],
  };
}

export async function GET(req: Request) {
  return withApiHandler(async () => {
    ensureDevBootCheck();

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("employeeCount");

    let employeeCount = 0;
    if (raw !== null && raw !== "") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return apiError("employeeCount must be a non-negative number", 400);
      }
      employeeCount = Math.floor(parsed);
    }

    const reportingPeriodId = searchParams.get("reportingPeriodId")?.trim();
    let materialityByFieldId: Record<string, import("@/lib/vsme/materiality").VsmeMateriality> = {};
    let reportedFieldIds = new Set<string>();
    if (reportingPeriodId) {
      [materialityByFieldId, reportedFieldIds] = await Promise.all([
        loadMaterialityForPeriod(reportingPeriodId),
        loadReportedFieldIds(reportingPeriodId),
      ]);
    }

    try {
      const schema = buildVsmeUiSchema(
        employeeCount,
        materialityByFieldId,
        reportedFieldIds
      );
      const fieldCount = schema.sections.reduce(
        (n, s) =>
          n + s.subsections.reduce((m, sub) => m + sub.fields.length, 0),
        0
      );
      if (fieldCount !== VSME_FIELD_COUNT) {
        console.warn(
          `[LibreVS] ui-schema field count ${fieldCount} !== registry ${VSME_FIELD_COUNT}`
        );
      }
      guardUiSchemaBuild(schema);
      return apiSuccess(schema);
    } catch (error) {
      console.error("[LibreVS] ui-schema build failed:", error);
      return apiSuccess(emptyUiSchemaFallback(employeeCount));
    }
  });
}
