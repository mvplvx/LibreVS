"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { CompanyRecord } from "./types";
import type { EuReportingCurrency } from "@/lib/vsme/currency";

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      currency,
      employeeCount,
    }: {
      companyId: string;
      currency?: EuReportingCurrency;
      employeeCount?: number | null;
    }) =>
      apiPatch<CompanyRecord>(`/api/company/${companyId}`, {
        ...(currency !== undefined ? { currency } : {}),
        ...(employeeCount !== undefined ? { employeeCount } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vsmeKeys.companies() });
    },
  });
}
