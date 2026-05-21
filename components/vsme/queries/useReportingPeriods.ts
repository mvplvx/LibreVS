"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { ReportingPeriodRecord } from "./types";

export function useReportingPeriods() {
  return useQuery({
    queryKey: vsmeKeys.reportingPeriods(),
    queryFn: () => apiGet<ReportingPeriodRecord[]>("/api/reporting-period"),
  });
}
