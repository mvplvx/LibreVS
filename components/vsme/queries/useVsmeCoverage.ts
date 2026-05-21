"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import { mapKpisToCoverage } from "./types";
import type { KpisPayload } from "./types";

export function useVsmeCoverage(reportingPeriodId: string) {
  const query = useQuery({
    queryKey: vsmeKeys.coverage(reportingPeriodId),
    queryFn: () =>
      apiGet<KpisPayload>(
        `/api/reporting-period/${reportingPeriodId}/kpis`
      ),
    enabled: !!reportingPeriodId,
  });

  return {
    ...query,
    coverage: mapKpisToCoverage(query.data),
  };
}
