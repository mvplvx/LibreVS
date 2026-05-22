"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { ExportAuditResult } from "@/lib/vsme/export/exportAudit";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";

/**
 * Export-scoped audit (persisted period state only).
 * Disabled when export is ready to avoid fan-out during normal completion.
 */
export function useExportAudit(
  reportingPeriodId: string,
  exportReady: boolean
) {
  const query = useQuery({
    queryKey: vsmeKeys.exportAudit(reportingPeriodId),
    queryFn: () =>
      apiGet<ExportAuditResult>(
        `/api/reporting-period/${reportingPeriodId}/export-audit`
      ),
    enabled: !!reportingPeriodId && !exportReady,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    audit: query.data ?? null,
  };
}
