import type { VsmeCompleteness } from "./completeness";

export type VsmeReportingState =
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "export_ready"
  | "exported";

export type ReportingStateInput = {
  requiredCoveragePercentage: number;
  completeness: Pick<VsmeCompleteness, "missingRequiredFields">;
};

export type DeriveReportingStateOptions = {
  /** When true (e.g. period workflow status), snapshot is treated as exported. */
  exportGenerated?: boolean;
};

/**
 * Derived workflow state from completeness snapshot (not persisted).
 *
 * - exported: export was generated (external flag)
 * - export_ready: all required fields complete
 * - ready_for_review: >80% required completion but gaps remain
 * - in_progress: 20–80% required completion
 * - draft: <20% required completion
 */
export function deriveReportingState(
  snapshot: ReportingStateInput,
  options: DeriveReportingStateOptions = {}
): VsmeReportingState {
  if (options.exportGenerated) {
    return "exported";
  }

  const completion = snapshot.requiredCoveragePercentage;
  const missingRequiredCount =
    snapshot.completeness.missingRequiredFields.length;

  if (missingRequiredCount === 0 && completion >= 100) {
    return "export_ready";
  }

  if (completion > 80 && missingRequiredCount > 0) {
    return "ready_for_review";
  }

  if (completion >= 20 && completion <= 80) {
    return "in_progress";
  }

  if (completion < 20) {
    return "draft";
  }

  if (completion > 80) {
    return missingRequiredCount > 0 ? "ready_for_review" : "export_ready";
  }

  return "in_progress";
}

export const REPORTING_STATE_LABELS: Record<VsmeReportingState, string> = {
  draft: "Draft",
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  export_ready: "Export ready",
  exported: "Exported",
};
