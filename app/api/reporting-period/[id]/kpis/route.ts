import { prisma } from "@/lib/db/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";

const ESG_CATEGORIES = ["energy", "emissions", "waste"] as const;

type KpiKey = (typeof ESG_CATEGORIES)[number];

function parseNumericValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumCategory(
  dataPoints: { category: string; value: string }[],
  category: string
): number {
  return dataPoints
    .filter((dp) => dp.category === category)
    .reduce((sum, dp) => {
      const numeric = parseNumericValue(dp.value);
      return numeric === null ? sum : sum + numeric;
    }, 0);
}

function categoryExists(
  dataPoints: { category: string; value: string }[],
  category: string
): boolean {
  const points = dataPoints.filter((dp) => dp.category === category);
  if (points.length === 0) {
    return false;
  }
  return sumCategory(dataPoints, category) > 0 || points.length >= 1;
}

function buildCompletenessScore(
  dataPoints: { category: string; value: string }[]
): number {
  let score = 0;
  if (categoryExists(dataPoints, "energy")) score += 40;
  if (categoryExists(dataPoints, "emissions")) score += 40;
  if (categoryExists(dataPoints, "waste")) score += 20;
  return score;
}

function buildInsights(
  dataPoints: { category: string; value: string }[],
  kpis: Record<KpiKey, number>
): string[] {
  const insights: string[] = [];

  if (dataPoints.length === 0) {
    insights.push("No data available for this period");
    return insights;
  }

  if (kpis.emissions > 1000) {
    insights.push("High emissions detected");
  }

  const missingCategory = ESG_CATEGORIES.some(
    (category) => !categoryExists(dataPoints, category)
  );
  if (missingCategory) {
    insights.push("Incomplete ESG dataset");
  }

  return insights;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: reportingPeriodId } = await Promise.resolve(params);

    const period = await prisma.reportingPeriod.findUnique({
      where: { id: reportingPeriodId },
    });

    if (!period) {
      return apiError("Reporting period not found", 404);
    }

    const dataPoints = await prisma.sustainabilityDataPoint.findMany({
      where: { reportingPeriodId },
    });

    const kpis = {
      energy: sumCategory(dataPoints, "energy"),
      emissions: sumCategory(dataPoints, "emissions"),
      waste: sumCategory(dataPoints, "waste"),
    };

    const categories = Array.from(
      new Set(dataPoints.map((dp) => dp.category))
    ).sort();

    const completenessScore = buildCompletenessScore(dataPoints);
    const insights = buildInsights(dataPoints, kpis);

    return apiSuccess({
      reportingPeriodId,
      totalDataPoints: dataPoints.length,
      categories,
      completenessScore,
      kpis,
      insights,
    });
  } catch {
    return apiError("Internal server error", 500);
  }
}
