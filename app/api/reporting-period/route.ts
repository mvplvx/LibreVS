import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const data = await prisma.reportingPeriod.findMany();
  return Response.json({ success: true, data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const result = await prisma.reportingPeriod.create({
    data: {
      year: body.year,
      status: body.status,
      companyId: body.companyId,
    },
  });

  return Response.json(result);
}