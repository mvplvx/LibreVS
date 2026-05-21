"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api/client";
import { queryClient } from "@/lib/query/queryClient";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";

export type ExportSnapshotSummary = {
  id: string;
  version: number;
  createdAt: string;
  isFinal: boolean;
  reportingState: string;
  coverage: number;
  companyId: string;
  rowCount: number;
  audit: {
    schemaVersion: string;
    userId: string;
    organizationId: string;
    year: number;
    employeeCount: number;
    rowCount: number;
    includedFieldCount: number;
    exportReady: boolean;
    efragValid: boolean;
    generatedAt: string;
    previousSnapshotId: string | null;
    finalizedAt?: string | null;
    finalizedByUserId?: string | null;
  };
};

export type ExportSnapshotsResponse = {
  reportingPeriodId: string;
  companyId: string;
  year: number;
  status: string;
  locked: boolean;
  finalSnapshotId: string | null;
  finalVersion: number | null;
  snapshots: ExportSnapshotSummary[];
};

export function useExportSnapshots(reportingPeriodId: string) {
  const query = useQuery({
    queryKey: vsmeKeys.exportSnapshots(reportingPeriodId),
    queryFn: () =>
      apiGet<ExportSnapshotsResponse>(
        `/api/reporting-period/${reportingPeriodId}/export-snapshots`
      ),
    enabled: !!reportingPeriodId,
  });

  return {
    ...query,
    history: query.data ?? null,
    locked: query.data?.locked ?? false,
    snapshots: query.data?.snapshots ?? [],
  };
}

export function useFinalizeExportSnapshot(reportingPeriodId: string) {
  return useMutation({
    mutationFn: async (snapshotId: string) =>
      apiPost<{
        snapshotId: string;
        version: number;
        reportingPeriodId: string;
        locked: boolean;
        message: string;
      }>(
        `/api/reporting-period/${reportingPeriodId}/export-snapshots/${snapshotId}/finalize`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.exportSnapshots(reportingPeriodId),
      });
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.dashboard(reportingPeriodId),
      });
      queryClient.invalidateQueries({
        queryKey: vsmeKeys.exportValidation(reportingPeriodId),
      });
      queryClient.invalidateQueries({ queryKey: vsmeKeys.reportingPeriods() });
    },
  });
}
