import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody, resolveRouteId } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const companyId = await resolveRouteId(params);

    if (!companyId) {
      return apiError("Company id is required", 400);
    }

    const body = await parseJsonBody(req);
    if (body === null || typeof body !== "object") {
      return apiError("Invalid JSON body", 400);
    }

    const { name, registrationNumber, country, industry, employeeCount } = body as {
      name?: unknown;
      registrationNumber?: unknown;
      country?: unknown;
      industry?: unknown;
      employeeCount?: unknown;
    };

    const existing = await prisma.company.findFirst({
      where: { id: companyId, organizationId },
    });

    if (!existing) {
      return apiError("Company not found", 404);
    }

    const data: {
      name?: string;
      registrationNumber?: string | null;
      country?: string | null;
      industry?: string | null;
      employeeCount?: number | null;
    } = {};

    if (typeof name === "string" && name.trim()) {
      data.name = name.trim();
    }
    if (registrationNumber !== undefined) {
      data.registrationNumber =
        typeof registrationNumber === "string" ? registrationNumber : null;
    }
    if (country !== undefined) {
      data.country = typeof country === "string" ? country : null;
    }
    if (industry !== undefined) {
      data.industry = typeof industry === "string" ? industry : null;
    }
    if (employeeCount !== undefined) {
      if (employeeCount === null) {
        data.employeeCount = null;
      } else if (
        typeof employeeCount === "number" &&
        Number.isFinite(employeeCount) &&
        employeeCount >= 0
      ) {
        data.employeeCount = Math.floor(employeeCount);
      } else {
        return apiError("employeeCount must be a non-negative number or null", 400);
      }
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    return apiSuccess(company);
  });
}
