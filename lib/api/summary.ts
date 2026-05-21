import type { SustainabilityDataPoint } from "@prisma/client";

export type DataPointSummary = Record<
  string,
  { key: string; value: string; unit: string | null }[]
>;

export function buildDataPointSummary(dataPoints: SustainabilityDataPoint[]): {
  totalDataPoints: number;
  summary: DataPointSummary;
} {
  const summary = dataPoints.reduce<DataPointSummary>((acc, dp) => {
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

  return {
    totalDataPoints: dataPoints.length,
    summary,
  };
}
