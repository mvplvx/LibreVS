import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { findCompanyInOrganization } from "@/lib/api/organizationScope";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { createReportingPeriodSchema } from "@/lib/validators/reportingPeriod";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);

    const data = await prisma.reportingPeriod.findMany({
      where: { company: { organizationId } },
      orderBy: { year: "desc" },
    });
    return apiSuccess(data);
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = createReportingPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { year, companyId, status, startDate, endDate } = parsed.data;

    const company = await findCompanyInOrganization(companyId, organizationId);
    if (!company) {
      return apiError("Company not found", 404);
    }

    const existingPeriod = await prisma.reportingPeriod.findFirst({
      where: {
        companyId,
        year,
        company: { organizationId },
      },
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
        schemaVersion: VSME_SCHEMA_VERSION,
      },
    });

    return apiSuccess(reportingPeriod, 201);
  });
}
