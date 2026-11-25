import type { Prisma, PrismaClient } from "@prisma/client";

import {
  resolveModuleSelection,
  type ComprehensiveDisclosureId,
  type ModuleResolution,
  type ModuleSelectionRejection,
  type ReportingOption,
} from "./moduleSelection";

/**
 * Persisted VS 2026 reporting option for one reporting period.
 *
 * Future cutover: B1 paragraph 27(a) is still the registry booleans
 * B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY and
 * B1_MODULE_SELECTION_OPTION_BASIC_AND_COMPREHENSIVE. This period
 * configuration is the value those fields must be derived from. This
 * module does not read or write them, and it does not read employee count.
 *
 * Callers that serve an HTTP request must pass the organization id already
 * resolved by getUser. The query matches findReportingPeriodInOrganization:
 * a period outside that organization is PERIOD_NOT_FOUND. These functions
 * are not mounted on a route.
 */

export type ReportingPeriodAccess = {
  reportingPeriodId: string;
  organizationId: string;
};

export type StoredReportingConfiguration =
  | {
      readonly status: "NOT_CONFIGURED";
      readonly reportingPeriodId: string;
    }
  | {
      readonly status: "CONFIGURED";
      readonly reportingPeriodId: string;
      readonly reportingOption: ReportingOption;
      readonly additionalComprehensiveDisclosures: readonly ComprehensiveDisclosureId[];
      readonly resolution: ModuleResolution;
    };

export type ReportingConfigurationRejection =
  | ModuleSelectionRejection
  | "MISSING_ORGANIZATION"
  | "PERIOD_NOT_FOUND"
  | "STORED_CONFIGURATION_INVALID";

export type ReportingConfigurationResult =
  | { readonly ok: true; readonly configuration: StoredReportingConfiguration }
  | { readonly ok: false; readonly reason: ReportingConfigurationRejection };

export type ReportingConfigurationDb = PrismaClient | Prisma.TransactionClient;

type PeriodConfigurationRow = {
  vs2026ReportingOption: string | null;
  vs2026AdditionalComprehensiveDisclosures: string[];
};

function accessFailure(
  access: ReportingPeriodAccess,
): ReportingConfigurationRejection | null {
  if (access.organizationId.trim() === "") {
    return "MISSING_ORGANIZATION";
  }
  if (access.reportingPeriodId.trim() === "") {
    return "PERIOD_NOT_FOUND";
  }
  return null;
}

function periodWhere(access: ReportingPeriodAccess) {
  return {
    id: access.reportingPeriodId,
    company: { organizationId: access.organizationId },
  };
}

function fromStoredRow(
  reportingPeriodId: string,
  row: PeriodConfigurationRow,
): ReportingConfigurationResult {
  if (row.vs2026ReportingOption === null) {
    return {
      ok: true,
      configuration: { status: "NOT_CONFIGURED", reportingPeriodId },
    };
  }

  const validated = resolveModuleSelection({
    reportingOption: row.vs2026ReportingOption,
    additionalComprehensiveDisclosures: row.vs2026AdditionalComprehensiveDisclosures,
  });
  if (!validated.ok) {
    return { ok: false, reason: "STORED_CONFIGURATION_INVALID" };
  }

  return {
    ok: true,
    configuration: {
      status: "CONFIGURED",
      reportingPeriodId,
      reportingOption: validated.resolution.reportingOption,
      additionalComprehensiveDisclosures:
        validated.resolution.additionalComprehensiveDisclosures,
      resolution: validated.resolution,
    },
  };
}

export async function getReportingConfiguration(
  access: ReportingPeriodAccess,
  db: ReportingConfigurationDb,
): Promise<ReportingConfigurationResult> {
  const failure = accessFailure(access);
  if (failure) {
    return { ok: false, reason: failure };
  }

  const period = await db.reportingPeriod.findFirst({
    where: periodWhere(access),
    select: {
      vs2026ReportingOption: true,
      vs2026AdditionalComprehensiveDisclosures: true,
    },
  });
  if (!period) {
    return { ok: false, reason: "PERIOD_NOT_FOUND" };
  }
  return fromStoredRow(access.reportingPeriodId, period);
}

/**
 * Validate with resolveModuleSelection, then write only the two configuration
 * columns for the period inside the organization. Datapoints and the company
 * row are not updated.
 */
export async function saveReportingConfiguration(
  access: ReportingPeriodAccess,
  input: unknown,
  db: ReportingConfigurationDb,
): Promise<ReportingConfigurationResult> {
  const failure = accessFailure(access);
  if (failure) {
    return { ok: false, reason: failure };
  }

  const validated = resolveModuleSelection(input);
  if (!validated.ok) {
    return validated;
  }

  const written = await db.reportingPeriod.updateMany({
    where: periodWhere(access),
    data: {
      vs2026ReportingOption: validated.resolution.reportingOption,
      vs2026AdditionalComprehensiveDisclosures: [
        ...validated.resolution.additionalComprehensiveDisclosures,
      ],
    },
  });
  if (written.count !== 1) {
    return { ok: false, reason: "PERIOD_NOT_FOUND" };
  }

  return {
    ok: true,
    configuration: {
      status: "CONFIGURED",
      reportingPeriodId: access.reportingPeriodId,
      reportingOption: validated.resolution.reportingOption,
      additionalComprehensiveDisclosures:
        validated.resolution.additionalComprehensiveDisclosures,
      resolution: validated.resolution,
    },
  };
}
