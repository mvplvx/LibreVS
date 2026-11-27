import { requireApiContext } from "@/lib/auth";
import { withApiHandler } from "@/lib/api/handler";
import { apiError } from "@/lib/api/response";
import { retiredDataPointWrite, retiredReportingResponse } from "@/lib/vsme/retiredRoute";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const reportingPeriodId = new URL(req.url).searchParams.get("reportingPeriodId")?.trim() ?? "";
  if (reportingPeriodId === "") {
    return withApiHandler(async () => {
      await requireApiContext(req);
      return apiError("reportingPeriodId query parameter is required", 400);
    });
  }
  return retiredReportingResponse(req, reportingPeriodId);
}

export async function POST(req: Request) {
  return retiredDataPointWrite(req);
}
