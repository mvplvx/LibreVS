"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPut } from "@/lib/api/client";
import { queryClient } from "@/lib/query/queryClient";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { VsmeMateriality } from "../types";
import type { MaterialityResponse } from "./types";

type UpdateMaterialityInput = {
  reportingPeriodId: string;
  fieldId: string;
  materiality: VsmeMateriality;
  employeeCount: number;
};

export function useUpdateVsmeMateriality() {
  return useMutation({
    mutationFn: async ({
      reportingPeriodId,
      fieldId,
      materiality,
    }: UpdateMaterialityInput) => {
      return apiPut<MaterialityResponse>(
        `/api/reporting-period/${reportingPeriodId}/materiality`,
        { items: [{ fieldId, materiality }] }
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        vsmeKeys.materiality(variables.reportingPeriodId),
        data
      );
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.materiality(variables.reportingPeriodId),
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
