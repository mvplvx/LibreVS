"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api/client";
import { queryClient } from "@/lib/query/queryClient";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";

type SaveFieldInput = {
  reportingPeriodId: string;
  fieldId: string;
  value: string;
  unit?: string | null;
  employeeCount: number;
};

export function useSaveVsmeField() {
  return useMutation({
    mutationFn: async ({
      reportingPeriodId,
      fieldId,
      value,
      unit,
    }: SaveFieldInput) => {
      if (!value.trim()) {
        throw new Error("Value is required");
      }
      return apiPost("/api/data-point", {
        reportingPeriodId,
        dataPoints: [
          {
            fieldId,
            value: value.trim(),
            ...(unit != null && unit !== "" ? { unit } : {}),
          },
        ],
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.fieldValues(variables.reportingPeriodId),
      });
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.uiSchema(
          variables.employeeCount,
          variables.reportingPeriodId
        ),
      });
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.coverage(variables.reportingPeriodId),
      });
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.dashboard(variables.reportingPeriodId),
      });
    },
  });
}
