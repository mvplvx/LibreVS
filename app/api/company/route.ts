import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  DEFAULT_REPORTING_CURRENCY,
  type EuReportingCurrency,
} from "@/lib/vsme/currency";
import { validateReportingCurrencyInput } from "@/lib/vsme/validateReportingCurrency";

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

    const { name, registrationNumber, country, industry, employeeCount, currency } =
      body as {
      name?: unknown;
      registrationNumber?: unknown;
      country?: unknown;
      industry?: unknown;
      employeeCount?: unknown;
      currency?: unknown;
    };

    if (typeof name !== "string" || !name.trim()) {
      return apiError("name is required", 400);
    }

    const parsedEmployeeCount =
      typeof employeeCount === "number" && Number.isFinite(employeeCount)
        ? Math.max(0, Math.floor(employeeCount))
        : undefined;

    let parsedCurrency: EuReportingCurrency = DEFAULT_REPORTING_CURRENCY;
    if (currency !== undefined) {
      const currencyResult = validateReportingCurrencyInput(currency);
      if (!currencyResult.ok) {
        return apiError(currencyResult.error, 400);
      }
      parsedCurrency = currencyResult.currency as EuReportingCurrency;
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
        employeeCount: parsedEmployeeCount,
        currency: parsedCurrency,
        organizationId,
      },
    });

    return apiSuccess(company, 201);
  });
}
