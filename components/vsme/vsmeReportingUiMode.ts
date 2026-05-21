import type { ReportingState } from "@/lib/vsme/getReportingState";
import { getReportingStateFlags } from "@/lib/vsme/getReportingState";

export type VsmeReportingUiMode = {
  state: ReportingState;
  flags: ReturnType<typeof getReportingStateFlags>;
  showForm: boolean;
  showProgressHeader: boolean;
  navEnabled: boolean;
  navVisible: boolean;
  fieldsReadOnly: boolean;
  materialityEditable: boolean;
  autoExpandFirstSection: boolean;
  formDeemphasized: boolean;
  summaryProminent: boolean;
  showMissingRequiredIndicator: boolean;
  auditHeaderTone: boolean;
};

export function deriveVsmeReportingUiMode(
  state: ReportingState
): VsmeReportingUiMode {
  const flags = getReportingStateFlags(state);

  return {
    state,
    flags,
    showForm: state !== "WORKSPACE_INITIALIZED",
    showProgressHeader:
      state === "MATERIALITY_DEFINED" ||
      state === "DATA_IN_PROGRESS" ||
      state === "VALIDATION_READY" ||
      state === "EXPORT_READY" ||
      state === "EXPORTED",
    navEnabled:
      state === "MATERIALITY_DEFINED" ||
      state === "DATA_IN_PROGRESS" ||
      state === "VALIDATION_READY" ||
      state === "EXPORT_READY" ||
      state === "EXPORTED",
    navVisible: state !== "WORKSPACE_INITIALIZED",
    fieldsReadOnly: state === "CONTEXT_READY" || state === "EXPORTED",
    materialityEditable:
      state === "CONTEXT_READY" ||
      state === "MATERIALITY_DEFINED" ||
      state === "DATA_IN_PROGRESS" ||
      state === "VALIDATION_READY" ||
      state === "EXPORT_READY",
    autoExpandFirstSection: state === "MATERIALITY_DEFINED",
    formDeemphasized: state === "VALIDATION_READY",
    summaryProminent:
      state === "VALIDATION_READY" || state === "EXPORT_READY",
    showMissingRequiredIndicator: state === "DATA_IN_PROGRESS",
    auditHeaderTone: state === "VALIDATION_READY",
  };
}
