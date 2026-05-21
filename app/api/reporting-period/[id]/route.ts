import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const id = await resolveRouteId(params);
    if (!id) {
      return apiError("Reporting period id is required", 400);
    }

    const reportingPeriod = await prisma.reportingPeriod.findFirst({
      where: {
        id,
        company: { organizationId },
      },
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
