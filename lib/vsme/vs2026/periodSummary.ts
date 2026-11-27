import type { PrismaClient } from "@prisma/client";

import { isVS2026EditorEnabled } from "./editorAvailability";
import { getVS2026ReportingState, type ReviewReadiness } from "./reportingState";
import { reportingStandardFromOption } from "./reportingStandard";

export type Vs2026PeriodSummary = {
  reportingPeriodId: string;
  year: number;
  companyName: string;
  reportingOption: "OPTION_A" | "OPTION_B" | null;
  standard: "UNCONFIGURED" | "OPTION_A" | "OPTION_B" | "INVALID";
  editorEnabled: boolean;
  readiness: ReviewReadiness | null;
  readinessMessage: string;
  snapshots: { id: string; revision: number; finalisedAt: string }[];
};

const READINESS_TEXT: Record<ReviewReadiness, string> = {
  NOT_CONFIGURED: "Choose Option A to start the Basic Module. Comprehensive Module support comes later.",
  IN_PROGRESS: "Basic Module entry is in progress. This is an internal review status, not a certification.",
  NEEDS_ASSESSMENT: "Some disclosures still need the undertaking's assessment.",
  NEEDS_CORRECTION: "Some saved values need correction before review.",
  READY_FOR_REVIEW: "The technical review has no blocking issue. Finalising remains the undertaking's declaration.",
  UNSUPPORTED: "Option B is stored. The Comprehensive Module is not available yet.",
  INVALID_REPORTING_STATE: "The stored reporting option is not valid.",
};

export async function loadVs2026PeriodSummary(input: {
  request: Request;
  reportingPeriodId: string;
  organizationId: string;
  db: PrismaClient;
}): Promise<Vs2026PeriodSummary | null> {
  const period = await input.db.reportingPeriod.findFirst({
    where: { id: input.reportingPeriodId, company: { organizationId: input.organizationId } },
    select: {
      id: true,
      year: true,
      vs2026ReportingOption: true,
      company: { select: { name: true } },
      vs2026ReportSnapshots: {
        select: { id: true, revision: true, finalisedAt: true },
        orderBy: { revision: "desc" },
      },
    },
  });
  if (!period) {
    return null;
  }
  const identity = reportingStandardFromOption(period.vs2026ReportingOption);
  const standard =
    identity.kind === "VS2026"
      ? identity.option
      : identity.kind === "UNCONFIGURED"
        ? "UNCONFIGURED"
        : "INVALID";
  const editorEnabled = isVS2026EditorEnabled();
  const snapshots = period.vs2026ReportSnapshots.map((snapshot) => ({
    id: snapshot.id,
    revision: snapshot.revision,
    finalisedAt: snapshot.finalisedAt.toISOString(),
  }));
  if (!editorEnabled) {
    return {
      reportingPeriodId: period.id,
      year: period.year,
      companyName: period.company.name,
      reportingOption: identity.kind === "VS2026" ? identity.option : null,
      standard,
      editorEnabled: false,
      readiness: null,
      readinessMessage: "The VS 2026 editor is not enabled. Finalised report downloads stay available.",
      snapshots,
    };
  }
  const state = await getVS2026ReportingState({
    request: input.request,
    reportingPeriodId: period.id,
    db: input.db,
  });
  if (!state.ok) {
    return {
      reportingPeriodId: period.id,
      year: period.year,
      companyName: period.company.name,
      reportingOption: identity.kind === "VS2026" ? identity.option : null,
      standard,
      editorEnabled: true,
      readiness: null,
      readinessMessage: state.message,
      snapshots,
    };
  }
  const provenance = state.review.issues.some((item) => item.code === "DATA_INTEGRITY_CONFLICT");
  return {
    reportingPeriodId: period.id,
    year: period.year,
    companyName: period.company.name,
    reportingOption: state.reportingOption,
    standard,
    editorEnabled: true,
    readiness: state.review.readiness,
    readinessMessage: provenance
      ? "This period contains reporting data that cannot be verified as a VS 2026 fact. Create a new period for a clean Basic Module report."
      : READINESS_TEXT[state.review.readiness],
    snapshots,
  };
}
