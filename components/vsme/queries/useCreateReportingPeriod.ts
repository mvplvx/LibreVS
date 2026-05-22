"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api/client";
import { queryClient } from "@/lib/query/queryClient";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { ReportingPeriodRecord } from "./types";

type CreateReportingPeriodInput = {
  companyId: string;
  year: number;
};

export function useCreateReportingPeriod() {
  return useMutation({
    mutationFn: async (input: CreateReportingPeriodInput) =>
      apiPost<ReportingPeriodRecord>("/api/reporting-period", {
        companyId: input.companyId,
        year: input.year,
        status: "draft",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vsmeKeys.reportingPeriods() });
    },
  });
}
