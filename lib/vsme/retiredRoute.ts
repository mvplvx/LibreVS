import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import { requireApiContext } from "@/lib/auth";
import { withApiHandler, parseJsonBody, resolveRouteId } from "@/lib/api/handler";
import { apiError } from "@/lib/api/response";
import { RETIRED_REPORTING_MESSAGE } from "@/lib/vsme/vs2026/reportingStandard";

export { RETIRED_REPORTING_MESSAGE };

/**
 * Authenticated retired-route response.
 * A period the caller does not own stays 404. An owned period returns 410 and writes nothing.
 */
export async function retiredReportingResponse(
  req: Request,
  reportingPeriodId?: string | null,
): Promise<Response> {
  return withApiHandler(async () => {
    const { organizationId } = await requireApiContext(req);
    if (reportingPeriodId !== undefined) {
      const id = reportingPeriodId?.trim() ?? "";
      if (id === "") {
        return apiError("Reporting period not found", 404);
      }
      const period = await findReportingPeriodById(id, organizationId);
      if (!period) {
        return apiError("Reporting period not found", 404);
      }
    }
    return apiError(RETIRED_REPORTING_MESSAGE, 410);
  });
}

export async function retiredPeriodRoute(
  req: Request,
  params: Promise<{ id: string }> | { id: string },
): Promise<Response> {
  const id = await resolveRouteId(params);
  if (!id) {
    return apiError("Reporting period id is required", 400);
  }
  return retiredReportingResponse(req, id);
}

export async function retiredDataPointWrite(req: Request): Promise<Response> {
  return withApiHandler(async () => {
    const { organizationId } = await requireApiContext(req);
    const body = await parseJsonBody(req);
    const raw =
      body && typeof body === "object" && "reportingPeriodId" in body
        ? (body as { reportingPeriodId?: unknown }).reportingPeriodId
        : "";
    const id = typeof raw === "string" ? raw.trim() : "";
    if (id === "") {
      return apiError("reportingPeriodId is required", 400);
    }
    const period = await findReportingPeriodById(id, organizationId);
    if (!period) {
      return apiError("Reporting period not found", 404);
    }
    return apiError(RETIRED_REPORTING_MESSAGE, 410);
  });
}
