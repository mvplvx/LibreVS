import { prisma } from "@/lib/db/prisma";
import { bulkDataPointSchema } from "@/lib/validation/dataPoint";

export async function POST(req: Request) {
  const body = await req.json();

  const parsed = bulkDataPointSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { reportingPeriodId, dataPoints } = parsed.data;

  const result = await prisma.sustainabilityDataPoint.createMany({
    data: dataPoints.map((dp) => ({
      ...dp,
      reportingPeriodId,
    })),
  });

  return Response.json({
    success: true,
    created: result.count,
  });
}