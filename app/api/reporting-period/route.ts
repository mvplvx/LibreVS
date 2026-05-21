import { prisma } from "@/lib/db/prisma";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { createReportingPeriodSchema } from "@/lib/validators/reportingPeriod";

export async function GET() {
  return withApiHandler(async () => {
    const data = await prisma.reportingPeriod.findMany({
      orderBy: { year: "desc" },
    });
    return apiSuccess(data);
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = createReportingPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { year, companyId, status, startDate, endDate } = parsed.data;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return apiError("Company not found", 404);
    }

    const existingPeriod = await prisma.reportingPeriod.findFirst({
      where: { companyId, year },
    });
    if (existingPeriod) {
      return apiError(
        "A reporting period for this company and year already exists",
        409
      );
    }

    const reportingPeriod = await prisma.reportingPeriod.create({
      data: {
        year,
        companyId,
        status,
        startDate,
        endDate,
      },
    });

    return apiSuccess(reportingPeriod, 201);
  });
}
