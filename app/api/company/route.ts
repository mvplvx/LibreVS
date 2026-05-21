import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);

    const companies = await prisma.company.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(companies);
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const body = await parseJsonBody(req);
    if (body === null || typeof body !== "object") {
      return apiError("Invalid JSON body", 400);
    }

    const { name, registrationNumber, country, industry } = body as {
      name?: unknown;
      registrationNumber?: unknown;
      country?: unknown;
      industry?: unknown;
    };

    if (typeof name !== "string" || !name.trim()) {
      return apiError("name is required", 400);
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        registrationNumber:
          typeof registrationNumber === "string"
            ? registrationNumber
            : undefined,
        country: typeof country === "string" ? country : undefined,
        industry: typeof industry === "string" ? industry : undefined,
        organizationId,
      },
    });

    return apiSuccess(company, 201);
  });
}
