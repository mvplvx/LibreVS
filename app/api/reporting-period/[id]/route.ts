import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const reportingPeriodId = params.id;

  const dataPoints = await prisma.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
  });

  const summary = dataPoints.reduce((acc: any, dp) => {
    if (!acc[dp.category]) {
      acc[dp.category] = [];
    }

    acc[dp.category].push({
      key: dp.key,
      value: dp.value,
      unit: dp.unit,
    });

    return acc;
  }, {});

  return Response.json({
    reportingPeriodId,
    totalDataPoints: dataPoints.length,
    summary,
  });
}