import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const companies = await prisma.company.findMany();

  return Response.json({
    success: true,
    data: companies,
  });
}