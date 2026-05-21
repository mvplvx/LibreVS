import { prisma } from "@/lib/db/prisma";
import { getUser } from "@/lib/auth";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const companies = await prisma.company.findMany({
      where: { organizationId },
    });
    return apiSuccess(companies);
  });
}
