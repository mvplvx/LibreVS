"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { VsmeUiField, VsmeUiSchema } from "../types";

export function useVsmeUiSchema(
  employeeCount: number,
  reportingPeriodId: string
) {
  const query = useQuery({
    queryKey: vsmeKeys.uiSchema(employeeCount, reportingPeriodId),
    queryFn: async () => {
      const params = new URLSearchParams({
        employeeCount: String(Math.max(0, Math.floor(employeeCount))),
      });
      if (reportingPeriodId) {
        params.set("reportingPeriodId", reportingPeriodId);
      }
      return apiGet<VsmeUiSchema>(`/api/vsme/ui-schema?${params}`);
    },
  });

  const fields = useMemo((): VsmeUiField[] => {
    if (!query.data) {
      return [];
    }
    return query.data.sections.flatMap((section) =>
      section.subsections.flatMap((subsection) => subsection.fields)
    );
  }, [query.data]);

  return {
    ...query,
    schema: query.data ?? null,
    fields,
    fieldCount: fields.length,
  };
}
