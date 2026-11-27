import type { PrismaClient } from "@prisma/client";

import type {
  EmployeeSizeEvaluationInput,
  EvaluationInput,
  ExplicitApplicabilityInput,
  FactInput,
  FactPresence,
  OmissionClaimInput,
  RepeatingRowInput,
} from "./evaluation";
import {
  classifyEmployeeSize,
  VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
} from "./employeeSize";
import {
  registryDatapoint,
  repeatingStorageGroupId,
  validateRepeatingCell,
  validateRepeatingParent,
  type RepeatingParent,
} from "./repeatingIntegrity";
import {
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
  disclosureDatapoints,
} from "./registry";
import type { Vs2026Datapoint, Vs2026Disclosure } from "./registry/types";
import {
  getReportingConfiguration,
  type ReportingConfigurationDb,
  type ReportingPeriodAccess,
  type StoredReportingConfiguration,
} from "./reportingConfiguration";

/**
 * Read-only construction of a VS-01 EvaluationInput from one reporting period.
 * Not imported by routes, autosave, workspace, or exports.
 * The organisation id must already have been resolved by the authenticated caller.
 */

const DISCLOSURES: readonly Vs2026Disclosure[] = [
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
];

const ENERGY_GROUPS = [
  "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
  "B3_ENERGY_CONSUMPTION_FROM_FUELS",
] as const;

const SCOPE3_GROUP = "B3_SCOPE3_SIGNIFICANT_CATEGORIES";
const OMISSION_GROUP = "B1_OMITTED_DISCLOSURES";

const SITE_REFERENCE_DATAPOINT_BY_GROUP: Readonly<Record<string, string>> = {
  B5_SITE_ASSESSMENT: "B5_ASSESSED_SITE_REFERENCE",
  B5_SITE_BSA_RELATIONSHIP: "B5_RELATIONSHIP_SITE_REFERENCE",
  B6_WATER_STRESS_SITE: "B6_WATER_STRESS_SITE_REFERENCE",
};

const NUMERIC_KINDS = new Set([
  "NUMBER",
  "MONETARY",
  "QUANTITY",
  "DIMENSIONED_QUANTITY",
  "REPEATING_QUANTITY",
  "REPEATING_DIMENSIONED_QUANTITY",
  "PROPORTION",
  "PERCENTAGE",
  "COUNT",
  "WORKFORCE_COUNT",
  "ACCIDENT_RATE",
  "HOURS_WORKED",
  "HOURS_AVERAGE",
]);

const TEXT_KINDS = new Set([
  "TEXT",
  "NARRATIVE",
  "GPS_LOCATION",
  "EXPLICIT_STATEMENT",
  "ENUMERATION_SET",
  "COUNTRY_CODE",
  "USER_DOCUMENT_REFERENCE",
]);

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const PARAGRAPH_22_POINTS = new Set(["22(a)", "22(b)", "22(c)", "22(d)"]);

const DATAPOINTS: ReadonlyMap<string, Vs2026Datapoint> = new Map(
  DISCLOSURES.flatMap((disclosure) =>
    disclosureDatapoints(disclosure, true).map((datapoint) => [datapoint.id, datapoint] as const),
  ),
);

const REGISTRY_GROUP_IDS = new Set(
  DISCLOSURES.flatMap((disclosure) => disclosure.repeatingGroups.map((group) => group.id)),
);

const STORAGE_GROUP_IDS = new Set<string>([
  ...REGISTRY_GROUP_IDS,
  ...ENERGY_GROUPS,
  SCOPE3_GROUP,
  OMISSION_GROUP,
]);

export type PersistedScalarRow = {
  readonly fieldId: string;
  readonly value: string;
};

export type PersistedRepeatingValue = {
  readonly id: string;
  readonly datapointId: string;
  readonly dimensionMember: string;
  readonly value: string;
  readonly unit: string | null;
  readonly omissionConditionsAssessed?: boolean;
  readonly omissionReassessedForPeriod?: boolean;
};

export type PersistedRepeatingRow = {
  readonly id: string;
  readonly reportingPeriodId: string;
  readonly groupId: string;
  readonly parentRowId: string | null;
  readonly position: number;
  readonly values: readonly PersistedRepeatingValue[];
};

export type PersistedReportingSnapshot = {
  readonly reportingPeriodId: string;
  readonly configuration: StoredReportingConfiguration;
  readonly scalars: readonly PersistedScalarRow[];
  readonly rows: readonly PersistedRepeatingRow[];
};

export type PersistedDataIssueCode =
  | "UNKNOWN_GROUP"
  | "UNKNOWN_DATAPOINT"
  | "SCALAR_STORED_AS_REPEATING_CELL"
  | "REPEATING_DATAPOINT_STORED_AS_SCALAR"
  | "GROUP_MISMATCH"
  | "PARENT_REQUIRED"
  | "PARENT_NOT_ALLOWED"
  | "PARENT_NOT_SITE"
  | "PARENT_PERIOD_MISMATCH"
  | "PARENT_NOT_IN_PERIOD"
  | "SITE_REFERENCE_CONFLICT"
  | "DUPLICATE_SINGLETON_ROW"
  | "DUPLICATE_DIMENSION"
  | "DUPLICATE_OMISSION"
  | "DUPLICATE_EMPLOYEE_MEASURE"
  | "MALFORMED_VALUE"
  | "LEGACY_CONFIGURATION_CONFLICT";

export type PersistedDataIssue = {
  readonly code: PersistedDataIssueCode;
  readonly rowId: string | null;
  readonly datapointId: string | null;
};

export type LoadedRepeatingCell = {
  readonly id: string;
  readonly datapointId: string;
  readonly dimensionMember: string;
  readonly value: string;
  readonly unit: string | null;
};

export type LoadedRepeatingRow = {
  readonly rowId: string;
  readonly groupId: string;
  readonly reportingPeriodId: string;
  readonly parentRowId: string | null;
  readonly position: number;
  readonly cells: readonly LoadedRepeatingCell[];
};

export type LoadedEvaluation = {
  readonly input: EvaluationInput;
  readonly rows: readonly LoadedRepeatingRow[];
  readonly excludedFieldIds: readonly string[];
};

export type LoadEvaluationFailureReason =
  | "MISSING_ORGANIZATION"
  | "PERIOD_NOT_FOUND"
  | "STORED_CONFIGURATION_INVALID"
  | "PERSISTED_DATA_INVALID"
  | "DATABASE_FAILURE";

export type LoadEvaluationResult =
  | {
      readonly ok: true;
      readonly reportingPeriodId: string;
      readonly loaded: LoadedEvaluation;
    }
  | {
      readonly ok: false;
      readonly reason: LoadEvaluationFailureReason;
      readonly issues: readonly PersistedDataIssue[];
    };

export function mapPersistedReportingSnapshot(
  snapshot: PersistedReportingSnapshot,
): LoadEvaluationResult {
  const issues: PersistedDataIssue[] = [];
  const rows = [...snapshot.rows].sort(compareRows);
  const parents = new Map(rows.map((row) => [row.id, row]));
  const excludedFieldIds: string[] = [];
  const facts: FactInput[] = [];

  for (const scalar of [...snapshot.scalars].sort((left, right) =>
    left.fieldId.localeCompare(right.fieldId),
  )) {
    const mapped = mapScalar(snapshot, scalar, excludedFieldIds);
    if (mapped.issue) {
      issues.push(mapped.issue);
    }
    if (mapped.fact) {
      facts.push(mapped.fact);
    }
  }

  const loadedRows: LoadedRepeatingRow[] = [];
  const evaluationRows: RepeatingRowInput[] = [];
  const seenEnergy = new Set<string>();
  const seenCategories = new Set<string>();
  const seenOmissions = new Set<string>();
  const omissionClaims: OmissionClaimInput[] = [];

  for (const row of rows) {
    if (!STORAGE_GROUP_IDS.has(row.groupId)) {
      issues.push(issue("UNKNOWN_GROUP", row.id, null));
      continue;
    }
    if (row.reportingPeriodId !== snapshot.reportingPeriodId) {
      issues.push(issue("PARENT_PERIOD_MISMATCH", row.id, null));
      continue;
    }

    const parent = row.parentRowId ? parents.get(row.parentRowId) ?? null : null;
    if (row.parentRowId && !parent) {
      issues.push(issue("PARENT_NOT_IN_PERIOD", row.id, null));
    }
    const parentDecision = validateRepeatingParent({
      groupId: row.groupId,
      reportingPeriodId: row.reportingPeriodId,
      parent: parent ? toParent(parent) : null,
    });
    if (!parentDecision.ok) {
      issues.push(issue(parentDecision.reason, row.id, null));
    }

    const isEnergy = ENERGY_GROUPS.includes(row.groupId as (typeof ENERGY_GROUPS)[number]);
    if (isEnergy) {
      if (seenEnergy.has(row.groupId)) {
        issues.push(issue("DUPLICATE_SINGLETON_ROW", row.id, row.groupId));
      }
      seenEnergy.add(row.groupId);
    }

    const cells = [...row.values].sort(compareCells);
    const loadedCells: LoadedRepeatingCell[] = [];
    const evaluationCells: FactInput[] = [];
    const seenDimensions = new Set<string>();

    for (const cell of cells) {
      const cellDecision = validateRepeatingCell({
        rowGroupId: row.groupId,
        datapointId: cell.datapointId,
      });
      if (!cellDecision.ok) {
        issues.push(
          issue(cellCode(cellDecision.reason), row.id, cell.datapointId),
        );
        continue;
      }
      const dimensionKey = `${cell.datapointId}\u0000${cell.dimensionMember}`;
      if (seenDimensions.has(dimensionKey)) {
        issues.push(issue("DUPLICATE_DIMENSION", row.id, cell.datapointId));
        continue;
      }
      seenDimensions.add(dimensionKey);

      const datapoint = registryDatapoint(cell.datapointId);
      if (!datapoint) {
        issues.push(issue("UNKNOWN_DATAPOINT", row.id, cell.datapointId));
        continue;
      }
      const presence = presenceForStoredValue(datapoint, cell.value, cell.dimensionMember);
      if (!presence) {
        issues.push(issue("MALFORMED_VALUE", row.id, cell.datapointId));
        continue;
      }
      if (isEnergy && !acceptedReportedUnit(datapoint, cell.unit)) {
        issues.push(issue("MALFORMED_VALUE", row.id, cell.datapointId));
        continue;
      }
      if (row.groupId === SCOPE3_GROUP) {
        if (cell.dimensionMember.trim() === "") {
          issues.push(issue("MALFORMED_VALUE", row.id, cell.datapointId));
          continue;
        }
        if (seenCategories.has(cell.dimensionMember)) {
          issues.push(issue("DUPLICATE_DIMENSION", row.id, cell.datapointId));
          continue;
        }
        seenCategories.add(cell.dimensionMember);
      }
      if (row.groupId === OMISSION_GROUP) {
        const omittedId = cell.value.trim();
        if (!PARAGRAPH_22_POINTS.has(cell.dimensionMember) || omittedId === "") {
          issues.push(issue("MALFORMED_VALUE", row.id, cell.datapointId));
          continue;
        }
        if (seenOmissions.has(omittedId)) {
          issues.push(issue("DUPLICATE_OMISSION", row.id, cell.datapointId));
          continue;
        }
        seenOmissions.add(omittedId);
        omissionClaims.push({
          datapointId: omittedId,
          reason: cell.dimensionMember as "22(a)" | "22(b)" | "22(c)" | "22(d)",
          reassessedForPeriod: cell.omissionReassessedForPeriod === true,
          conditionsAssessed: cell.omissionConditionsAssessed === true,
        });
      }

      loadedCells.push({
        id: cell.id,
        datapointId: cell.datapointId,
        dimensionMember: cell.dimensionMember,
        value: cell.value,
        unit: cell.unit,
      });
      if (isEnergy) {
        const unit = cell.unit?.trim() ?? "";
        facts.push({
          datapointId: cell.datapointId,
          dimensionMember: cell.dimensionMember,
          ...(unit === "" ? {} : { unit }),
          presence,
        });
      } else {
        evaluationCells.push({ datapointId: cell.datapointId, presence });
      }
    }

    const siteDatapointId = SITE_REFERENCE_DATAPOINT_BY_GROUP[row.groupId];
    if (siteDatapointId && parentDecision.ok && parent) {
      const storedSite = cells.find((cell) => cell.datapointId === siteDatapointId);
      if (storedSite && storedSite.value !== parent.id) {
        issues.push(issue("SITE_REFERENCE_CONFLICT", row.id, siteDatapointId));
      } else if (!storedSite) {
        evaluationCells.push({
          datapointId: siteDatapointId,
          presence: {
            kind: "PRESENT",
            literal: { kind: "SITE_REFERENCE", siteRowId: parent.id },
          },
        });
      }
    }

    loadedRows.push({
      rowId: row.id,
      groupId: row.groupId,
      reportingPeriodId: row.reportingPeriodId,
      parentRowId: row.parentRowId,
      position: row.position,
      cells: loadedCells,
    });
    if (!isEnergy) {
      evaluationRows.push({
        rowId: row.id,
        groupId: row.groupId,
        cells: evaluationCells.sort((left, right) =>
          left.datapointId.localeCompare(right.datapointId),
        ),
      });
    }
  }

  if (omissionClaims.length > 0) {
    facts.push({
      datapointId: OMISSION_GROUP,
      presence: {
        kind: "PRESENT",
        literal: {
          kind: "REFERENCES",
          datapointIds: omissionClaims.map((claim) => claim.datapointId).sort(),
        },
      },
    });
  }

  const employeeSize = employeeSizeInput(snapshot, issues);
  if (issues.length > 0) {
    return {
      ok: false,
      reason: "PERSISTED_DATA_INVALID",
      issues: sortIssues(issues),
    };
  }

  const applicabilityAssessments: readonly ExplicitApplicabilityInput[] = [];
  const input: EvaluationInput = {
    configuration: configurationInput(snapshot.configuration),
    employeeSize,
    facts,
    repeatingRows: evaluationRows,
    omissions: omissionClaims,
    applicabilityAssessments,
  };

  return {
    ok: true,
    reportingPeriodId: snapshot.reportingPeriodId,
    loaded: {
      input,
      rows: loadedRows,
      excludedFieldIds: [...excludedFieldIds].sort(),
    },
  };
}

export async function loadVS2026EvaluationInput(
  access: ReportingPeriodAccess,
  db: ReportingConfigurationDb,
): Promise<LoadEvaluationResult> {
  try {
    if (isPrismaClient(db)) {
      return await db.$transaction((tx) => readAuthorizedSnapshot(access, tx));
    }
    return await readAuthorizedSnapshot(access, db);
  } catch {
    return { ok: false, reason: "DATABASE_FAILURE", issues: [] };
  }
}

async function readAuthorizedSnapshot(
  access: ReportingPeriodAccess,
  db: ReportingConfigurationDb,
): Promise<LoadEvaluationResult> {
  const configuration = await getReportingConfiguration(access, db);
  if (!configuration.ok) {
    const reason =
      configuration.reason === "MISSING_ORGANIZATION" ||
      configuration.reason === "PERIOD_NOT_FOUND"
        ? configuration.reason
        : "STORED_CONFIGURATION_INVALID";
    return { ok: false, reason, issues: [] };
  }

  const scalars = await db.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId: access.reportingPeriodId },
    orderBy: { fieldId: "asc" },
    select: { fieldId: true, value: true },
  });
  const rows = await db.vs2026RepeatingRow.findMany({
    where: { reportingPeriodId: access.reportingPeriodId },
    orderBy: [{ groupId: "asc" }, { position: "asc" }, { id: "asc" }],
    include: {
      values: {
        orderBy: [{ datapointId: "asc" }, { dimensionMember: "asc" }, { id: "asc" }],
      },
    },
  });

  return mapPersistedReportingSnapshot({
    reportingPeriodId: access.reportingPeriodId,
    configuration: configuration.configuration,
    scalars,
    rows,
  });
}

/**
 * The field id is the measure kind. A missing row is NOT_PROVIDED.
 * A stored number is classified by classifyEmployeeSize. A negative or
 * non-numeric value stays MEASURED so that classifier rejects it.
 * This reader does not confirm that the writer collected the figure for
 * this control. Copying another workforce quantity into this field is a
 * writer responsibility and is not detected here.
 */
function employeeSizeInput(
  snapshot: PersistedReportingSnapshot,
  issues: PersistedDataIssue[],
): EmployeeSizeEvaluationInput {
  const stored = snapshot.scalars.filter(
    (scalar) => scalar.fieldId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  );
  if (stored.length === 0) {
    return { status: "NOT_PROVIDED" };
  }
  if (stored.length > 1) {
    issues.push(
      issue("DUPLICATE_EMPLOYEE_MEASURE", null, VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE),
    );
    return { status: "NOT_PROVIDED" };
  }
  const raw = stored[0]?.value ?? "";
  const employeeMeasure = DECIMAL.test(raw) ? Number(raw) : Number.NaN;
  const measured = {
    reportingPeriodId: snapshot.reportingPeriodId,
    employeeMeasure,
    measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  };
  const classified = classifyEmployeeSize(measured);
  if (classified.ok) {
    return {
      status: "MEASURED",
      reportingPeriodId: classified.reportingPeriodId,
      employeeMeasure: classified.employeeMeasure,
      measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
    };
  }
  return { status: "MEASURED", ...measured };
}

function mapScalar(
  snapshot: PersistedReportingSnapshot,
  scalar: PersistedScalarRow,
  excludedFieldIds: string[],
): { fact?: FactInput; issue?: PersistedDataIssue } {
  if (scalar.fieldId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE) {
    excludedFieldIds.push(scalar.fieldId);
    return {};
  }
  const datapoint = DATAPOINTS.get(scalar.fieldId);
  if (!datapoint) {
    excludedFieldIds.push(scalar.fieldId);
    return {};
  }
  if (datapoint.id === "B1_MODULE_OPTION") {
    return moduleOptionScalar(snapshot.configuration, scalar.value);
  }
  if (repeatingStorageGroupId(datapoint) !== null) {
    return { issue: issue("REPEATING_DATAPOINT_STORED_AS_SCALAR", null, datapoint.id) };
  }
  const presence = presenceForStoredValue(datapoint, scalar.value, "");
  if (!presence) {
    return { issue: issue("MALFORMED_VALUE", null, datapoint.id) };
  }
  return { fact: { datapointId: datapoint.id, presence } };
}

function moduleOptionScalar(
  configuration: StoredReportingConfiguration,
  value: string,
): { issue?: PersistedDataIssue } {
  const configured =
    configuration.status === "CONFIGURED" ? configuration.reportingOption : null;
  if (configured === null || value !== configured) {
    return { issue: issue("LEGACY_CONFIGURATION_CONFLICT", null, "B1_MODULE_OPTION") };
  }
  return {};
}

function presenceForStoredValue(
  datapoint: Vs2026Datapoint,
  raw: string,
  dimensionMember: string,
): FactPresence | null {
  const kind = datapoint.value.kind;
  if (TEXT_KINDS.has(kind)) {
    return raw.trim() === ""
      ? { kind: "EMPTY" }
      : { kind: "PRESENT", literal: { kind: "TEXT", text: raw } };
  }
  if (kind === "BOOLEAN") {
    if (raw === "true") {
      return { kind: "PRESENT", literal: { kind: "BOOLEAN", value: true } };
    }
    if (raw === "false") {
      return { kind: "PRESENT", literal: { kind: "BOOLEAN", value: false } };
    }
    return null;
  }
  if (kind === "ENUMERATION") {
    if (raw.trim() === "") {
      return { kind: "EMPTY" };
    }
    if (datapoint.value.kind === "ENUMERATION" && datapoint.value.members.length > 0) {
      const known = datapoint.value.members.some((member) => member.id === raw);
      if (!known) {
        return null;
      }
    }
    return { kind: "PRESENT", literal: { kind: "ENUMERATION", memberId: raw } };
  }
  if (kind === "SITE_REFERENCE") {
    if (raw.trim() === "") {
      return { kind: "EMPTY" };
    }
    return { kind: "PRESENT", literal: { kind: "SITE_REFERENCE", siteRowId: raw } };
  }
  if (kind === "REPEATING_REFERENCES") {
    return raw.trim() === ""
      ? { kind: "EMPTY" }
      : { kind: "PRESENT", literal: { kind: "TEXT", text: raw } };
  }
  if (NUMERIC_KINDS.has(kind)) {
    if (kind === "DIMENSIONED_QUANTITY" && datapoint.value.kind === "DIMENSIONED_QUANTITY") {
      const origin = datapoint.value.axes.find((axis) => axis.id === "ENERGY_ORIGIN");
      if (origin && !origin.legalMembers.includes(dimensionMember)) {
        return null;
      }
    }
    if (!DECIMAL.test(raw)) {
      return null;
    }
    return { kind: "PRESENT", literal: { kind: "NUMBER", value: Number(raw) } };
  }
  return null;
}

function acceptedReportedUnit(datapoint: Vs2026Datapoint, unit: string | null): boolean {
  if (unit === null || unit.trim() === "") {
    return true;
  }
  if (!("reportedUnit" in datapoint.value)) {
    return true;
  }
  return unit === datapoint.value.reportedUnit;
}

function configurationInput(
  configuration: StoredReportingConfiguration,
): EvaluationInput["configuration"] {
  if (configuration.status === "NOT_CONFIGURED") {
    return { status: "NOT_CONFIGURED" };
  }
  return {
    status: "CONFIGURED",
    reportingOption: configuration.reportingOption,
    additionalComprehensiveDisclosures: configuration.additionalComprehensiveDisclosures,
  };
}

function toParent(row: PersistedRepeatingRow): RepeatingParent {
  return {
    id: row.id,
    groupId: row.groupId,
    reportingPeriodId: row.reportingPeriodId,
  };
}

function cellCode(
  reason: "UNKNOWN_DATAPOINT" | "SCALAR_DATAPOINT" | "GROUP_MISMATCH",
): PersistedDataIssueCode {
  if (reason === "SCALAR_DATAPOINT") {
    return "SCALAR_STORED_AS_REPEATING_CELL";
  }
  return reason;
}

function issue(
  code: PersistedDataIssueCode,
  rowId: string | null,
  datapointId: string | null,
): PersistedDataIssue {
  return { code, rowId, datapointId };
}

function compareRows(left: PersistedRepeatingRow, right: PersistedRepeatingRow): number {
  return (
    left.groupId.localeCompare(right.groupId) ||
    left.position - right.position ||
    left.id.localeCompare(right.id)
  );
}

function compareCells(left: PersistedRepeatingValue, right: PersistedRepeatingValue): number {
  return (
    left.datapointId.localeCompare(right.datapointId) ||
    left.dimensionMember.localeCompare(right.dimensionMember) ||
    left.id.localeCompare(right.id)
  );
}

function sortIssues(issues: readonly PersistedDataIssue[]): PersistedDataIssue[] {
  return [...issues].sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      (left.rowId ?? "").localeCompare(right.rowId ?? "") ||
      (left.datapointId ?? "").localeCompare(right.datapointId ?? ""),
  );
}

function isPrismaClient(db: ReportingConfigurationDb): db is PrismaClient {
  return "$connect" in db;
}
