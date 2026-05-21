"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { DashboardPayload } from "./types";

export function useVsmeDashboard(reportingPeriodId: string) {
  return useQuery({
    queryKey: vsmeKeys.dashboard(reportingPeriodId),
    queryFn: () =>
      apiGet<DashboardPayload>(
        `/api/reporting-period/${reportingPeriodId}/dashboard`
      ),
    enabled: !!reportingPeriodId,
  });
}
