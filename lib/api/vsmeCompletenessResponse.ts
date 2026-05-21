import type { VsmeCompleteness } from "@/lib/vsme/completeness";
import type { VsmePeriodSnapshot } from "@/lib/vsme/periodSnapshot";
import { guardKpiApiPayload } from "@/lib/vsme/dev/contractGuard";

/** Shared completeness fields for dashboard / KPI API payloads. */
export function completenessApiFields(vsme: VsmePeriodSnapshot) {
  const payload = {
    completeness: vsme.completeness,
    inScopeCoveragePercentage: vsme.inScopeCoveragePercentage,
    materialCoveragePercentage: vsme.materialCoveragePercentage,
    mandatoryCoveragePercentage: vsme.requiredCoveragePercentage,
    /** @deprecated Use mandatoryCoveragePercentage — CONTRACT_API.md */
    requiredCoveragePercentage: vsme.requiredCoveragePercentage,
    requiredFieldCount: vsme.completeness.requiredFieldIds.length,
    exportReady: vsme.exportReady,
    reportingState: vsme.reportingState,
    totalCoveragePercentage: vsme.totalCoveragePercentage,
  };
  guardKpiApiPayload(payload, "completenessApiFields");
  return payload;
}

export type CompletenessApiShape = ReturnType<typeof completenessApiFields> & {
  completeness: VsmeCompleteness;
};
