import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const companies = await prisma.company.findMany();

  return Response.json({
    success: true,
    data: companies,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const company = await prisma.company.create({
    data: {
      name: body.name,
      registrationNumber: body.registrationNumber,
      country: body.country,
      industry: body.industry,
    },
  });

  return Response.json({
    success: true,
    data: company,
  });
}