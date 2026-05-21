import { getUser } from "@/lib/auth";
import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import {
  parseJsonBody,
  resolveRouteId,
  withApiHandler,
} from "@/lib/api/handler";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import {
  loadMaterialityForPeriod,
  upsertMaterialityForPeriod,
} from "@/lib/vsme/loadMateriality";
import type { VsmeMateriality } from "@/lib/vsme/materiality";
import { validateFieldId } from "@/lib/vsme/validateField";
import { updateMaterialitySchema } from "@/lib/validators/materiality";

export type MaterialityApiPayload = {
  reportingPeriodId: string;
  byFieldId: Record<string, VsmeMateriality>;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const reportingPeriodId = await resolveRouteId(params);

    if (!reportingPeriodId) {
      return apiError("Reporting period id is required", 400);
    }

    const reportingPeriod = await findReportingPeriodById(
      reportingPeriodId,
      organizationId
    );
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const byFieldId = await loadMaterialityForPeriod(reportingPeriodId);

    return apiSuccess({
      reportingPeriodId,
      byFieldId,
    } satisfies MaterialityApiPayload);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const reportingPeriodId = await resolveRouteId(params);

    if (!reportingPeriodId) {
      return apiError("Reporting period id is required", 400);
    }

    const reportingPeriod = await findReportingPeriodById(
      reportingPeriodId,
      organizationId
    );
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = updateMaterialitySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const validationErrors: string[] = [];
    const items: Array<{ fieldId: string; materiality: VsmeMateriality }> = [];

    for (const item of parsed.data.items) {
      if (!validateFieldId(item.fieldId)) {
        validationErrors.push(`Unknown VSME fieldId: ${item.fieldId}`);
        continue;
      }
      items.push({
        fieldId: item.fieldId,
        materiality: item.materiality,
      });
    }

    if (validationErrors.length > 0) {
      return apiError(validationErrors.join("; "), 400);
    }

    await upsertMaterialityForPeriod(reportingPeriodId, items);

    const byFieldId = await loadMaterialityForPeriod(reportingPeriodId);

    return apiSuccess({
      reportingPeriodId,
      byFieldId,
    } satisfies MaterialityApiPayload);
  });
}
