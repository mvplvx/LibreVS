"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import { mapFieldValuesToRecord } from "./types";
import type { StoredDataPoint } from "./types";

export function useVsmeFieldValues(reportingPeriodId: string) {
  return useQuery({
    queryKey: vsmeKeys.fieldValues(reportingPeriodId),
    queryFn: () =>
      apiGet<StoredDataPoint[]>(
        `/api/data-point?reportingPeriodId=${encodeURIComponent(reportingPeriodId)}`
      ),
    enabled: !!reportingPeriodId,
  });
}

/** Map server rows to fieldId-keyed values for the form renderer. */
export function useVsmeFieldValuesMap(reportingPeriodId: string) {
  const query = useVsmeFieldValues(reportingPeriodId);
  const values = useMemo(
    () => mapFieldValuesToRecord(query.data),
    [query.data]
  );
  return {
    ...query,
    values,
  };
}
