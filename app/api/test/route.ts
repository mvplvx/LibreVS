import { prisma } from "@/lib/db/prisma";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return withApiHandler(async () => {
    const companies = await prisma.company.findMany();
    return apiSuccess(companies);
  });
}
