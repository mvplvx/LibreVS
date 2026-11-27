import { prisma } from "@/lib/db/prisma";
import { requireApiContext } from "@/lib/auth";
import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { loadVs2026PeriodSummary } from "@/lib/vsme/vs2026/periodSummary";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ reportingPeriodId: string }> },
) {
  return withApiHandler(async () => {
    const { organizationId } = await requireApiContext(req);
    const { reportingPeriodId } = await context.params;
    const summary = await loadVs2026PeriodSummary({
      request: req,
      reportingPeriodId,
      organizationId,
      db: prisma,
    });
    if (!summary) {
      return apiError("Reporting period not found", 404);
    }
    return apiSuccess(summary);
  });
}
