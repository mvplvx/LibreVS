import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { validateFieldId } from "@/lib/vsme/validateField";
import { validateFieldValue } from "@/lib/vsme/validateFieldValue";
import { getRegistryEntry } from "@/lib/vsme/vsme.fieldRegistry";
import { filterLegacyDataPoints } from "@/lib/vsme/runtime/dataTruthMode";
import { bulkDataPointSchema } from "@/lib/validators/datapoint";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const reportingPeriodId = new URL(req.url).searchParams
      .get("reportingPeriodId")
      ?.trim();

    if (!reportingPeriodId) {
      return apiError("reportingPeriodId query parameter is required", 400);
    }

    const reportingPeriod = await findReportingPeriodById(
      reportingPeriodId,
      organizationId
    );
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const dataPoints = await prisma.sustainabilityDataPoint.findMany({
      where: { reportingPeriodId },
      orderBy: { fieldId: "asc" },
    });

    const v2Rows = filterLegacyDataPoints(
      dataPoints.map((dp) => ({
        fieldId: dp.fieldId,
        legacyFieldId: dp.legacyFieldId,
        migrationStatus: dp.migrationStatus,
      }))
    );
    const v2Ids = new Set(v2Rows.map((r) => r.fieldId));

    return apiSuccess(
      dataPoints
        .filter((dp) => v2Ids.has(dp.fieldId))
        .map((dp) => {
          const entry = getRegistryEntry(dp.fieldId)!;
          return {
            id: dp.id,
            reportingPeriodId: dp.reportingPeriodId,
            fieldId: dp.fieldId,
            path: entry.path,
            value: dp.value,
            unit: dp.unit,
            createdAt: dp.createdAt,
          };
        })
    );
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = bulkDataPointSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { reportingPeriodId, dataPoints } = parsed.data;

    const reportingPeriod = await findReportingPeriodById(
      reportingPeriodId,
      organizationId
    );
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const v2Writes: {
      fieldId: string;
      value: string;
      unit: string | null;
    }[] = [];
    const legacyWrites: {
      fieldId: string;
      value: string;
      unit: string | null;
    }[] = [];

    for (const dp of dataPoints) {
      if (validateFieldId(dp.fieldId)) {
        v2Writes.push({
          fieldId: dp.fieldId,
          value: dp.value,
          unit: dp.unit ?? null,
        });
      } else {
        legacyWrites.push({
          fieldId: dp.fieldId,
          value: dp.value,
          unit: dp.unit ?? null,
        });
      }
    }

    const validationErrors: string[] = [];
    const normalizedV2: {
      fieldId: string;
      value: string;
      unit: string | null;
    }[] = [];

    for (const dp of v2Writes) {
      const entry = getRegistryEntry(dp.fieldId)!;
      const result = validateFieldValue(entry, dp.value, dp.unit);
      if (!result.ok) {
        validationErrors.push(result.error);
        continue;
      }
      normalizedV2.push({
        fieldId: dp.fieldId,
        value: result.normalizedValue,
        unit: result.unit,
      });
    }

    if (validationErrors.length > 0) {
      return apiError(validationErrors.join("; "), 400);
    }

    const allFieldIds = [
      ...normalizedV2.map((dp) => dp.fieldId),
      ...legacyWrites.map((dp) => dp.fieldId),
    ];
    const existing = await prisma.sustainabilityDataPoint.findMany({
      where: {
        reportingPeriodId,
        fieldId: { in: allFieldIds },
      },
      select: { fieldId: true },
    });
    const existingIds = new Set(existing.map((row) => row.fieldId));

    await prisma.$transaction([
      ...normalizedV2.map((dp) =>
        prisma.sustainabilityDataPoint.upsert({
          where: {
            reportingPeriodId_fieldId: {
              reportingPeriodId,
              fieldId: dp.fieldId,
            },
          },
          create: {
            reportingPeriodId,
            fieldId: dp.fieldId,
            value: dp.value,
            unit: dp.unit,
            legacyFieldId: null,
            migratedFieldId: null,
            migrationStatus: null,
          },
          update: {
            value: dp.value,
            unit: dp.unit,
            legacyFieldId: null,
            migratedFieldId: null,
            migrationStatus: null,
          },
        })
      ),
      ...legacyWrites.map((dp) =>
        prisma.sustainabilityDataPoint.upsert({
          where: {
            reportingPeriodId_fieldId: {
              reportingPeriodId,
              fieldId: dp.fieldId,
            },
          },
          create: {
            reportingPeriodId,
            fieldId: dp.fieldId,
            value: dp.value,
            unit: dp.unit,
            legacyFieldId: dp.fieldId,
            migratedFieldId: null,
            migrationStatus: "legacy_only",
          },
          update: {
            value: dp.value,
            unit: dp.unit,
            legacyFieldId: dp.fieldId,
            migratedFieldId: null,
            migrationStatus: "legacy_only",
          },
        })
      ),
    ]);

    const upserted = normalizedV2.length + legacyWrites.length;
    const created =
      normalizedV2.filter((dp) => !existingIds.has(dp.fieldId)).length +
      legacyWrites.filter((dp) => !existingIds.has(dp.fieldId)).length;
    const updated = upserted - created;

    return apiSuccess(
      {
        upserted,
        created,
        updated,
        v2Upserted: normalizedV2.length,
        legacyStored: legacyWrites.length,
      },
      200
    );
  });
}
