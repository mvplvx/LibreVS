export const ESG_CATEGORIES = ["energy", "emissions", "waste"] as const;

export type EsgCategory = (typeof ESG_CATEGORIES)[number];

export type DataPointRecord = {
  category: string;
  key: string;
  value: string;
  unit: string | null;
  createdAt: Date;
};

export type CategoryBreakdown = {
  total: number;
  dataPointCount: number;
  metrics: { key: string; value: string; unit: string | null }[];
};

export type KpiTotals = {
  energy: number;
  emissions: number;
  waste: number;
};

export type QualityScores = {
  completenessScore: number;
  freshnessScore: number;
  consistencyScore: number;
};

export type PeriodSummary = {
  totalDataPoints: number;
  categories: string[];
  missingCategories: string[];
};

function parseNumericValue(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sumCategory(dataPoints: DataPointRecord[], category: string): number {
  return dataPoints
    .filter((dp) => dp.category === category)
    .reduce((sum, dp) => {
      const numeric = parseNumericValue(dp.value);
      return numeric === null ? sum : sum + numeric;
    }, 0);
}

function categoryDataPoints(
  dataPoints: DataPointRecord[],
  category: string
): DataPointRecord[] {
  return dataPoints.filter((dp) => dp.category === category);
}

function categoryHasValidNumeric(dataPoints: DataPointRecord[], category: string): boolean {
  return categoryDataPoints(dataPoints, category).some(
    (dp) => parseNumericValue(dp.value) !== null
  );
}

function categoryHasAnyData(dataPoints: DataPointRecord[], category: string): boolean {
  return categoryDataPoints(dataPoints, category).length > 0;
}

const CATEGORY_WEIGHTS: Record<EsgCategory, number> = {
  energy: 35,
  emissions: 35,
  waste: 30,
};

export function computeCompletenessScore(dataPoints: DataPointRecord[]): number {
  if (dataPoints.length === 0) {
    return 0;
  }

  let score = 0;
  for (const category of ESG_CATEGORIES) {
    const weight = CATEGORY_WEIGHTS[category];
    if (categoryHasValidNumeric(dataPoints, category)) {
      score += weight;
    } else if (categoryHasAnyData(dataPoints, category)) {
      score += weight * 0.5;
    }
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function computeFreshnessScore(
  dataPoints: DataPointRecord[],
  referenceDate: Date = new Date()
): number {
  if (dataPoints.length === 0) {
    return 0;
  }

  const latestMs = Math.max(
    ...dataPoints.map((dp) => dp.createdAt.getTime())
  );
  const daysSinceUpdate =
    (referenceDate.getTime() - latestMs) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 7) return 100;
  if (daysSinceUpdate <= 30) return 80;
  if (daysSinceUpdate <= 90) return 50;
  if (daysSinceUpdate <= 180) return 25;
  return 10;
}

export function computeConsistencyScore(dataPoints: DataPointRecord[]): number {
  if (dataPoints.length === 0) {
    return 0;
  }

  let issueCount = 0;
  const seenPairs = new Set<string>();

  for (const dp of dataPoints) {
    if (!dp.key.trim()) {
      issueCount += 1;
    }
    if (dp.value.trim() === "" || parseNumericValue(dp.value) === null) {
      issueCount += 1;
    }
    const pair = `${dp.category}::${dp.key.trim().toLowerCase()}`;
    if (seenPairs.has(pair)) {
      issueCount += 1;
    }
    seenPairs.add(pair);
  }

  const issueRatio = issueCount / dataPoints.length;
  const score = (1 - Math.min(issueRatio, 1)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function buildCategoryBreakdown(
  dataPoints: DataPointRecord[],
  category: string
): CategoryBreakdown {
  const points = categoryDataPoints(dataPoints, category);
  return {
    total: sumCategory(dataPoints, category),
    dataPointCount: points.length,
    metrics: points
      .map((dp) => ({
        key: dp.key,
        value: dp.value,
        unit: dp.unit,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function buildKpiTotals(dataPoints: DataPointRecord[]): KpiTotals {
  return {
    energy: sumCategory(dataPoints, "energy"),
    emissions: sumCategory(dataPoints, "emissions"),
    waste: sumCategory(dataPoints, "waste"),
  };
}

export function buildPeriodSummary(dataPoints: DataPointRecord[]): PeriodSummary {
  const categories = Array.from(
    new Set(dataPoints.map((dp) => dp.category))
  ).sort();
  const missingCategories = ESG_CATEGORIES.filter(
    (category) => !categories.includes(category)
  );

  return {
    totalDataPoints: dataPoints.length,
    categories,
    missingCategories: [...missingCategories],
  };
}

export function buildInsights(
  dataPoints: DataPointRecord[],
  kpis: KpiTotals,
  quality: QualityScores,
  summary: PeriodSummary
): string[] {
  const insights: string[] = [];

  if (dataPoints.length === 0) {
    insights.push("No data available for this period");
    return insights;
  }

  if (kpis.emissions === 0) {
    insights.push("No emissions data reported");
  }

  if (summary.categories.length < 2) {
    insights.push("Limited ESG coverage");
  }

  if (quality.completenessScore < 50) {
    insights.push("Dataset is incomplete");
  }

  if (quality.freshnessScore < 50) {
    insights.push("Data may be outdated");
  }

  if (quality.consistencyScore < 70) {
    insights.push("Data quality issues detected");
  }

  if (kpis.emissions > 1000) {
    insights.push("High emissions detected");
  }

  if (summary.missingCategories.length > 0) {
    insights.push(
      `Missing categories: ${summary.missingCategories.join(", ")}`
    );
  }

  return insights;
}

export type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";

export type GroupedSummary = Record<
  string,
  { key: string; value: string; unit: string | null }[]
>;

export type EsgRiskResult = {
  esgScore: number;
  riskLevel: RiskLevel;
  breakdown: {
    emissionsPenalty: number;
    completenessPenalty: number;
    missingDataPenalty: number;
  };
};

export function buildGroupedSummary(
  breakdown: Record<EsgCategory, CategoryBreakdown>
): GroupedSummary {
  const grouped: GroupedSummary = {};
  for (const category of ESG_CATEGORIES) {
    const metrics = breakdown[category].metrics;
    if (metrics.length > 0) {
      grouped[category] = metrics;
    }
  }
  for (const [category, data] of Object.entries(breakdown)) {
    if (!(category in grouped) && data.metrics.length > 0) {
      grouped[category] = data.metrics;
    }
  }
  return grouped;
}

export function classifyRisk(esgScore: number): RiskLevel {
  if (esgScore >= 80) return "LOW_RISK";
  if (esgScore >= 50) return "MEDIUM_RISK";
  return "HIGH_RISK";
}

export function computeEsgRiskScore(
  analysis: ReturnType<typeof analyzeReportingPeriodData>
): EsgRiskResult {
  const { kpis, quality, summary } = analysis;

  const emissionsPenalty = Math.min(100, kpis.emissions * 0.05);
  const completenessPenalty =
    quality.completenessScore < 100
      ? (100 - quality.completenessScore) * 0.3
      : 0;

  const missingPenalties: Record<EsgCategory, number> = {
    energy: 10,
    emissions: 20,
    waste: 5,
  };
  let missingDataPenalty = 0;
  for (const category of summary.missingCategories) {
    if (category in missingPenalties) {
      missingDataPenalty += missingPenalties[category as EsgCategory];
    }
  }

  const esgScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - emissionsPenalty - completenessPenalty - missingDataPenalty
      )
    )
  );

  return {
    esgScore,
    riskLevel: classifyRisk(esgScore),
    breakdown: {
      emissionsPenalty,
      completenessPenalty,
      missingDataPenalty,
    },
  };
}

export function analyzeReportingPeriodData(dataPoints: DataPointRecord[]) {
  const kpis = buildKpiTotals(dataPoints);
  const quality: QualityScores = {
    completenessScore: computeCompletenessScore(dataPoints),
    freshnessScore: computeFreshnessScore(dataPoints),
    consistencyScore: computeConsistencyScore(dataPoints),
  };
  const summary = buildPeriodSummary(dataPoints);
  const insights = buildInsights(dataPoints, kpis, quality, summary);

  const breakdown: Record<EsgCategory, CategoryBreakdown> = {
    energy: buildCategoryBreakdown(dataPoints, "energy"),
    emissions: buildCategoryBreakdown(dataPoints, "emissions"),
    waste: buildCategoryBreakdown(dataPoints, "waste"),
  };

  return {
    kpis,
    breakdown,
    quality,
    summary,
    insights,
  };
}

export type PeriodRecord = {
  id: string;
  year: number;
  status: string;
  companyId: string;
};

export function buildStandardPeriodIntelligence(period: PeriodRecord, dataPoints: DataPointRecord[]) {
  const analysis = analyzeReportingPeriodData(dataPoints);
  const esg = computeEsgRiskScore(analysis);
  const groupedSummary = buildGroupedSummary(analysis.breakdown);

  return {
    reportingPeriodId: period.id,
    year: period.year,
    status: period.status,
    companyId: period.companyId,
    kpis: {
      energy: analysis.kpis.energy,
      emissions: analysis.kpis.emissions,
      waste: analysis.kpis.waste,
      breakdown: analysis.breakdown,
    },
    quality: {
      completenessScore: analysis.quality.completenessScore,
      freshnessScore: analysis.quality.freshnessScore,
      consistencyScore: analysis.quality.consistencyScore,
    },
    summary: analysis.summary,
    groupedSummary,
    insights: analysis.insights,
    esg: {
      esgScore: esg.esgScore,
      riskLevel: esg.riskLevel,
      breakdown: esg.breakdown,
      completenessScore: analysis.quality.completenessScore,
    },
  };
}
