"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { ExportPreview } from "@/lib/vsme/buildExportPreview";
import type { ExportValidationResult } from "@/lib/vsme/validateEfragExport";
import type { ReportingState } from "@/lib/vsme/getReportingState";

export type ExportValidationPayload = {
  reportingPeriodId: string;
  year: number;
  status: string;
  reportingState: ReportingState;
  exportReady: boolean;
  validation: ExportValidationResult;
  preview: ExportPreview;
};

export function useExportValidation(reportingPeriodId: string) {
  const query = useQuery({
    queryKey: vsmeKeys.exportValidation(reportingPeriodId),
    queryFn: () =>
      apiGet<ExportValidationPayload>(
        `/api/reporting-period/${reportingPeriodId}/export-validation`
      ),
    enabled: !!reportingPeriodId,
  });

  return {
    ...query,
    validation: query.data?.validation ?? null,
    preview: query.data?.preview ?? null,
    reportingState: query.data?.reportingState ?? null,
    exportReady: query.data?.exportReady ?? false,
  };
}
