import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { validateFieldId } from "@/lib/vsme/validateField";
import { getRegistryEntry } from "@/lib/vsme/vsme.fieldRegistry";
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

    return apiSuccess(
      dataPoints.map((dp) => ({
        id: dp.id,
        reportingPeriodId: dp.reportingPeriodId,
        fieldId: dp.fieldId,
        path: getRegistryEntry(dp.fieldId)?.path ?? null,
        value: dp.value,
        unit: dp.unit,
        createdAt: dp.createdAt,
      }))
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

    const invalidFieldIds = dataPoints
      .map((dp) => dp.fieldId)
      .filter((fieldId) => !validateFieldId(fieldId));

    if (invalidFieldIds.length > 0) {
      return apiError(
        `Unknown VSME fieldId(s): ${[...new Set(invalidFieldIds)].join(", ")}`,
        400
      );
    }

    const result = await prisma.sustainabilityDataPoint.createMany({
      data: dataPoints.map((dp) => ({
        fieldId: dp.fieldId,
        value: dp.value,
        unit: dp.unit,
        reportingPeriodId,
      })),
    });

    return apiSuccess({ created: result.count }, 201);
  });
}
