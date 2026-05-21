"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import { mapMaterialityToRecord } from "./types";
import type { MaterialityResponse } from "./types";

export function useVsmeMateriality(reportingPeriodId: string) {
  const query = useQuery({
    queryKey: vsmeKeys.materiality(reportingPeriodId),
    queryFn: () =>
      apiGet<MaterialityResponse>(
        `/api/reporting-period/${reportingPeriodId}/materiality`
      ),
    enabled: !!reportingPeriodId,
  });

  return {
    ...query,
    byFieldId: mapMaterialityToRecord(query.data),
  };
}
