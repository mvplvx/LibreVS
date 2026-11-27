import { requireAuthenticatedUser, type AuthenticatedContext } from "../../auth";

import { evaluateVS2026ReportingState } from "./evaluation";
import { isVS2026PreviewEnabled } from "./previewAvailability";
import {
  buildRegulatoryPreviewView,
  explainPersistedIssue,
  type RegulatoryPreviewView,
} from "./previewPresentation";
import type { ReportingConfigurationDb, ReportingPeriodAccess } from "./reportingConfiguration";
import {
  loadVS2026EvaluationInput,
  type LoadEvaluationResult,
} from "./reportingDataLoader";

/**
 * Read-only VS 2026 preview for one reporting period.
 * Organisation id comes from the verified session and the domain user row.
 * The function does not write.
 */

export type RegulatoryPreviewFailureReason =
  | "PREVIEW_DISABLED"
  | "UNAUTHENTICATED"
  | "PERIOD_NOT_FOUND"
  | "STORED_CONFIGURATION_INVALID"
  | "PERSISTED_DATA_INVALID"
  | "DATABASE_FAILURE";

export type RegulatoryPreviewIssue = {
  readonly code: string;
  readonly explanation: string;
};

export type RegulatoryPreviewResult =
  | {
      readonly ok: true;
      readonly reportingPeriodId: string;
      readonly year: number | null;
      readonly companyName: string | null;
      readonly view: RegulatoryPreviewView;
    }
  | {
      readonly ok: false;
      readonly reason: RegulatoryPreviewFailureReason;
      readonly message: string;
      readonly issues: readonly RegulatoryPreviewIssue[];
    };

type PreviewLoad = (
  access: ReportingPeriodAccess,
  db: ReportingConfigurationDb,
) => Promise<LoadEvaluationResult>;

export async function getVS2026RegulatoryPreview(input: {
  reportingPeriodId: string;
  request: Request;
  db: ReportingConfigurationDb;
  isEnabled?: () => boolean;
  load?: PreviewLoad;
  resolveIdentity?: (request: Request) => Promise<AuthenticatedContext | null>;
}): Promise<RegulatoryPreviewResult> {
  const enabled = input.isEnabled ?? (() => isVS2026PreviewEnabled());
  if (!enabled()) {
    return failure(
      "PREVIEW_DISABLED",
      "The VS 2026 preview is not enabled.",
    );
  }

  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity) {
    return failure("UNAUTHENTICATED", "Sign-in is required to view this preview.");
  }

  const reportingPeriodId = input.reportingPeriodId.trim();
  if (reportingPeriodId === "") {
    return failure("PERIOD_NOT_FOUND", "Reporting period not found.");
  }

  const load = input.load ?? loadVS2026EvaluationInput;
  let loaded: LoadEvaluationResult;
  try {
    loaded = await load(
      { reportingPeriodId, organizationId: identity.organizationId },
      input.db,
    );
  } catch {
    return failure(
      "DATABASE_FAILURE",
      "The preview could not be loaded. No reporting data was changed.",
    );
  }

  if (!loaded.ok) {
    if (loaded.reason === "MISSING_ORGANIZATION") {
      return failure("UNAUTHENTICATED", "Sign-in is required to view this preview.");
    }
    if (loaded.reason === "PERIOD_NOT_FOUND") {
      return failure("PERIOD_NOT_FOUND", "Reporting period not found.");
    }
    if (loaded.reason === "DATABASE_FAILURE") {
      return failure(
        "DATABASE_FAILURE",
        "The preview could not be loaded. No reporting data was changed.",
      );
    }
    if (loaded.reason === "STORED_CONFIGURATION_INVALID") {
      return failure(
        "STORED_CONFIGURATION_INVALID",
        "The stored reporting configuration cannot be evaluated. Option A was not assumed.",
        loaded.issues.map((issue) => issue.code),
      );
    }
    return failure(
      "PERSISTED_DATA_INVALID",
      "Stored reporting data could not be evaluated. No report was produced.",
      loaded.issues.map((issue) => issue.code),
    );
  }

  const report = evaluateVS2026ReportingState(loaded.loaded.input);
  const period = await readPeriodLabel(input.db, {
    reportingPeriodId,
    organizationId: identity.organizationId,
  });
  if (!period.ok) {
    return failure(
      "DATABASE_FAILURE",
      "The preview could not be loaded. No reporting data was changed.",
    );
  }

  return {
    ok: true,
    reportingPeriodId,
    year: period.year,
    companyName: period.companyName,
    view: buildRegulatoryPreviewView(report, {
      rows: loaded.loaded.rows,
      excludedFieldIds: loaded.loaded.excludedFieldIds,
    }),
  };
}

async function readPeriodLabel(
  db: ReportingConfigurationDb,
  access: ReportingPeriodAccess,
): Promise<
  | { readonly ok: true; readonly year: number | null; readonly companyName: string | null }
  | { readonly ok: false }
> {
  try {
    const period = await db.reportingPeriod.findFirst({
      where: {
        id: access.reportingPeriodId,
        company: { organizationId: access.organizationId },
      },
      select: { year: true, company: { select: { name: true } } },
    });
    return {
      ok: true,
      year: period?.year ?? null,
      companyName: period?.company.name ?? null,
    };
  } catch {
    return { ok: false };
  }
}

function failure(
  reason: RegulatoryPreviewFailureReason,
  message: string,
  codes: readonly string[] = [],
): RegulatoryPreviewResult {
  return {
    ok: false,
    reason,
    message,
    issues: codes.map((code) => ({ code, explanation: explainPersistedIssue(code) })),
  };
}
