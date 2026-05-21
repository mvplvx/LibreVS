import { prisma } from "@/lib/db/prisma";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const id = await resolveRouteId(params);
    if (!id) {
      return apiError("Reporting period id is required", 400);
    }

    const reportingPeriod = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sustainabilityDataPoints: true },
        },
      },
    });

    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    return apiSuccess(reportingPeriod);
  });
}
