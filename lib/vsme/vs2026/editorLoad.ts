import type { AuthenticatedContext } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/auth";

import { isVS2026EditorEnabled } from "./editorAvailability";
import type {
  EditorDisclosureView,
  EditorFieldView,
  EditorReadyView,
  EditorRepeatingCellView,
  EditorRepeatingGroupView,
  EditorSiteOption,
  EditorUnavailableView,
} from "./editorView";
import { classifyEmployeeSize, VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { getReportingConfiguration, type ReportingConfigurationDb } from "./reportingConfiguration";
import {
  classifyRepeatingCell,
  energyOriginMembers,
  isEnergyGroup,
  isScope3Group,
  isSingletonGroup,
  OMISSION_GROUP_ID,
} from "./repeatingForm";
import { omissionWorkflowStatus } from "./structuredInput";
import { repeatingStorageGroupId } from "./repeatingIntegrity";
import { disclosureDatapoints } from "./registry";
import {
  classifyDatapoint,
  editorDisclosures,
  reasonLabel,
  registryDatapoint,
} from "./scalarEligibility";

const EMPLOYEE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export type EditorLoadResult =
  | { status: "DISABLED"; message: string }
  | { status: "UNAUTHENTICATED"; message: string }
  | { status: "NOT_FOUND"; message: string }
  | { status: "INVALID_CONFIGURATION"; message: string }
  | {
      status: "OPTION_B";
      message: string;
      reportingPeriodId: string;
      year: number | null;
      companyName: string | null;
      previewHref: string;
    }
  | { status: "READY"; view: EditorReadyView };

export async function loadVs2026Editor(input: {
  reportingPeriodId: string;
  request: Request;
  db: ReportingConfigurationDb;
  isEnabled?: (env: NodeJS.ProcessEnv) => boolean;
  resolveIdentity?: (request: Request) => Promise<AuthenticatedContext | null>;
}): Promise<EditorLoadResult> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  if (!enabled(process.env)) {
    return { status: "DISABLED", message: "The VS 2026 editor is not enabled." };
  }
  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity || identity.organizationId.trim() === "") {
    return { status: "UNAUTHENTICATED", message: "Sign-in is required." };
  }
  const reportingPeriodId = input.reportingPeriodId.trim();
  if (reportingPeriodId === "") {
    return { status: "NOT_FOUND", message: "Reporting period not found." };
  }

  const access = { reportingPeriodId, organizationId: identity.organizationId };
  let configuration;
  try {
    configuration = await getReportingConfiguration(access, input.db);
  } catch {
    return { status: "NOT_FOUND", message: "Reporting period not found." };
  }
  if (!configuration.ok) {
    if (configuration.reason === "STORED_CONFIGURATION_INVALID") {
      return {
        status: "INVALID_CONFIGURATION",
        message: "The stored reporting configuration cannot be edited. It was not changed.",
      };
    }
    return { status: "NOT_FOUND", message: "Reporting period not found." };
  }

  const period = await input.db.reportingPeriod.findFirst({
    where: { id: reportingPeriodId, company: { organizationId: identity.organizationId } },
    select: { year: true, company: { select: { name: true } } },
  });
  if (!period) {
    return { status: "NOT_FOUND", message: "Reporting period not found." };
  }
  const previewHref = `/vsme/vs2026/preview/${reportingPeriodId}`;
  if (
    configuration.configuration.status === "CONFIGURED" &&
    configuration.configuration.reportingOption === "OPTION_B"
  ) {
    return {
      status: "OPTION_B",
      message:
        "Option B is stored. Comprehensive disclosures are not edited here, and Option A was not applied.",
      reportingPeriodId,
      year: period.year,
      companyName: period.company.name,
      previewHref,
    };
  }

  const rows = await input.db.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
    select: {
      fieldId: true,
      value: true,
      updatedAt: true,
      legacyFieldId: true,
      migratedFieldId: true,
      migrationStatus: true,
    },
  });
  const byField = new Map(rows.map((row) => [row.fieldId, row]));
  const employee = byField.get(VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE);
  const employeeLocked = isLocked(employee);
  const employeeMeasure =
    employee && !employeeLocked && employee.value.trim() !== "" ? employee.value : null;

  const disclosures: EditorDisclosureView[] = editorDisclosures().map((disclosure) => {
    const fields: EditorFieldView[] = [];
    const unavailable: EditorUnavailableView[] = [];
    const grouped = new Set(disclosure.repeatingGroups.flatMap((group) => group.components.map((item) => item.id)));
    for (const datapoint of [...disclosure.datapoints, ...disclosure.guidanceDatapoints]) {
      if (grouped.has(datapoint.id)) {
        continue;
      }
      const storageGroup = repeatingStorageGroupId(datapoint);
      if (
        storageGroup &&
        storageGroup !== OMISSION_GROUP_ID &&
        (disclosure.repeatingGroups.some((group) => group.id === storageGroup) ||
          isEnergyGroup(storageGroup) ||
          isScope3Group(storageGroup))
      ) {
        continue;
      }
      const decision = classifyDatapoint(datapoint);
      if (!decision.editable) {
        unavailable.push({
          id: datapoint.id,
          label: datapoint.regulatoryStatement,
          paragraph: datapoint.paragraph,
          reason:
            datapoint.id === "B1_EXPLICIT_COMPLIANCE_STATEMENT"
              ? "The compliance statement is prepared when the report is finalised from the saved option. Saved values do not create it."
              : reasonLabel(decision.reason),
        });
        continue;
      }
      const stored = byField.get(datapoint.id);
      const locked = isLocked(stored);
      fields.push({
        id: datapoint.id,
        label: datapoint.regulatoryStatement,
        paragraph: datapoint.paragraph,
        preparation: decision.preparation,
        control: decision.control,
        value: locked || !stored || stored.value.trim() === "" ? null : stored.value,
        updatedAt: locked || !stored ? null : stored.updatedAt.toISOString(),
        locked,
      });
    }
    return {
      id: disclosure.id,
      title: disclosure.title,
      fields,
      unavailable,
      repeating: disclosure.repeatingGroups.map((group) => ({
        id: group.id,
        statement: group.regulatoryStatement,
        components: group.components.map((component) => ({
          id: component.id,
          label: component.regulatoryStatement,
        })),
      })),
    };
  });

  return {
    status: "READY",
    view: {
      reportingPeriodId,
      year: period.year,
      companyName: period.company.name,
      configurationStatus:
        configuration.configuration.status === "CONFIGURED" ? "OPTION_A" : "NOT_CONFIGURED",
      additionalComprehensiveDisclosures:
        configuration.configuration.status === "CONFIGURED"
          ? [...configuration.configuration.additionalComprehensiveDisclosures]
          : [],
      employeeMeasure,
      employeeLocked,
      employeeCategoryLabel: employeeCategoryLabel(reportingPeriodId, employeeMeasure),
      disclosures,
      ...(await repeatingEditorState(input.db, reportingPeriodId)),
      energyBreakdownLabel: energyBreakdownLabel(byField.get("B3_ENERGY_BREAKDOWN_INFORMATION")?.value),
      ...omissionCatalog(),
      previewHref,
    },
  };
}

async function repeatingRows(db: ReportingConfigurationDb, reportingPeriodId: string) {
  return db.vs2026RepeatingRow.findMany({
    where: { reportingPeriodId },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    include: {
      values: { orderBy: [{ datapointId: "asc" }, { dimensionMember: "asc" }, { id: "asc" }] },
    },
  });
}

async function repeatingEditorState(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
): Promise<{ repeatingGroups: EditorRepeatingGroupView[]; sites: EditorSiteOption[] }> {
  const groups = await repeatingGroupViews(db, reportingPeriodId);
  return groups;
}

async function repeatingGroupViews(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
): Promise<{ repeatingGroups: EditorRepeatingGroupView[]; sites: EditorSiteOption[] }> {
  const stored = await repeatingRows(db, reportingPeriodId);
  const sites = siteOptions(stored);
  const siteLabel = new Map(sites.map((site) => [site.id, site.label]));
  const groups: EditorRepeatingGroupView[] = [];
  for (const disclosure of editorDisclosures()) {
    for (const group of disclosure.repeatingGroups) {
      const rows = stored.filter((row) => row.groupId === group.id);
      const readOnly = group.id === OMISSION_GROUP_ID;
      groups.push({
        id: group.id,
        disclosureId: disclosure.id,
        statement: group.regulatoryStatement,
        singleton: false,
        usesSite: group.siteInventory === "B1_SITE",
        categoryEntry: false,
        energyMembers: null,
        readOnlyNotice: readOnly
          ? "Stored omission rows are unverified. This editor does not approve a paragraph 22 omission."
          : null,
        rows: rows.map((row) => ({
          id: row.id,
          position: row.position,
          parentRowId: row.parentRowId,
          parentLabel: row.parentRowId ? (siteLabel.get(row.parentRowId) ?? "B1 site") : null,
          cells: readOnly
            ? row.values.map((value) => ({
                datapointId: value.datapointId,
                label: value.datapointId,
                paragraph: "",
                preparation: false,
                unavailableReason: "Unverified stored omission.",
                control: null,
                dimensionMember: value.dimensionMember,
                value: value.value,
                updatedAt: value.updatedAt.toISOString(),
                unitLabel: null,
              }))
            : group.components
                .filter((component) => component.value.kind !== "SITE_REFERENCE")
                .map((component) => cellView(component, row.values)),
        })),
      });
    }
  }
  const omissionRows = stored.filter((row) => row.groupId === OMISSION_GROUP_ID);
  groups.push({
    id: OMISSION_GROUP_ID,
    disclosureId: "B1",
    statement: "Sensitive information omitted under paragraph 22.",
    singleton: false,
    usesSite: false,
    categoryEntry: false,
    energyMembers: null,
    readOnlyNotice:
      "A completed claim is a structural record of the undertaking's attestation. It is not an independent legal approval, and it does not store the underlying protected information.",
    rows: omissionRows.map((row) => ({
      id: row.id,
      position: row.position,
      parentRowId: null,
      parentLabel: null,
      cells: row.values.map((value) => ({
        datapointId: value.datapointId,
        label: omissionWorkflowStatus({
          conditionsAssessed: value.omissionConditionsAssessed,
          reassessedForPeriod: value.omissionReassessedForPeriod,
        }),
        paragraph: "",
        preparation: false,
        unavailableReason: null,
        control: null,
        dimensionMember: value.dimensionMember,
        value: value.value,
        updatedAt: value.updatedAt.toISOString(),
        unitLabel: null,
        omissionConditionsAssessed: value.omissionConditionsAssessed,
        omissionReassessedForPeriod: value.omissionReassessedForPeriod,
      })),
    })),
  });
  for (const datapointId of [
    "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
    "B3_ENERGY_CONSUMPTION_FROM_FUELS",
    "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
  ]) {
    const datapoint = registryDatapoint(datapointId);
    if (!datapoint) {
      continue;
    }
    const members = energyOriginMembers(datapoint);
    const rows = stored.filter((row) => row.groupId === datapointId);
    groups.push({
      id: datapointId,
      disclosureId: "B3",
      statement: datapoint.regulatoryStatement,
      singleton: isSingletonGroup(datapointId),
      usesSite: false,
      categoryEntry: isScope3Group(datapointId),
      energyMembers: members.length > 0 ? [...members] : null,
      readOnlyNotice: isScope3Group(datapointId)
        ? "Significant categories are supplementary. The current evaluator can still list this group as not assessed."
        : null,
      rows: rows.map((row) => ({
        id: row.id,
        position: row.position,
        parentRowId: null,
        parentLabel: null,
        cells:
          members.length > 0
            ? members.map((member) => {
                const storedValue = row.values.find((value) => value.dimensionMember === member);
                return cellView(datapoint, storedValue ? [storedValue] : [], member);
              })
            : row.values.map((value) => cellView(datapoint, [value], value.dimensionMember)),
      })),
    });
  }
  return { repeatingGroups: groups, sites };
}

function siteOptions(
  rows: { id: string; groupId: string; values: { datapointId: string; value: string }[] }[],
): EditorSiteOption[] {
  return rows
    .filter((row) => row.groupId === "B1_SITE")
    .map((row) => {
      const identifier = row.values.find((value) => value.datapointId === "B1_SITE_IDENTIFIER");
      const label = identifier?.value.trim() || "B1 site";
      return { id: row.id, label };
    });
}

function cellView(
  datapoint: NonNullable<ReturnType<typeof registryDatapoint>>,
  values: {
    datapointId: string;
    dimensionMember: string;
    value: string;
    unit: string | null;
    updatedAt?: Date;
  }[],
  dimensionMember = "",
): EditorRepeatingCellView {
  const decision = classifyRepeatingCell(datapoint);
  const stored = values.find(
    (value) => value.datapointId === datapoint.id && value.dimensionMember === dimensionMember,
  );
  const unitLabel =
    decision.editable && (decision.control.kind === "number" || decision.control.kind === "percentage")
      ? decision.control.rule.unitLabel
      : null;
  return {
    datapointId: datapoint.id,
    label: dimensionMember === "" ? datapoint.regulatoryStatement : dimensionMember,
    paragraph: datapoint.paragraph,
    preparation: decision.editable ? decision.preparation : false,
    unavailableReason: decision.editable
      ? null
      : decision.reason === "DIGITAL_ONLY"
        ? "This digital output is not entered in this editor."
        : "No verified input control exists for this value.",
    control: decision.editable ? decision.control : null,
    dimensionMember,
    value: stored?.value ?? null,
    updatedAt: stored?.updatedAt ? stored.updatedAt.toISOString() : null,
    unitLabel,
  };
}

function omissionCatalog(): {
  omissionTargets: { id: string; label: string }[];
  omissionReasons: { point: "22(a)" | "22(b)" | "22(c)" | "22(d)"; text: string }[];
} {
  const seen = new Set<string>();
  const omissionTargets = editorDisclosures().flatMap((disclosure) =>
    disclosureDatapoints(disclosure, true).flatMap((datapoint) => {
      if (seen.has(datapoint.id) || datapoint.id === OMISSION_GROUP_ID || datapoint.id === "B1_MODULE_OPTION") {
        return [];
      }
      seen.add(datapoint.id);
      return [{ id: datapoint.id, label: `${datapoint.id} — ${datapoint.regulatoryStatement}` }];
    }),
  );
  const omissionReasons = (registryDatapoint(OMISSION_GROUP_ID)?.omission?.reasons ?? []).map((reason) => ({
    point: reason.point,
    text: reason.text,
  }));
  return { omissionTargets, omissionReasons };
}

function energyBreakdownLabel(value: string | undefined): string {
  if (value === "CAN_OBTAIN") {
    return "Breakdown information can be obtained. A missing member stays missing, and totals are not calculated.";
  }
  if (value === "CANNOT_OBTAIN") {
    return "Breakdown information cannot be obtained. Stored energy values are kept and are not required.";
  }
  return "Breakdown information has not been assessed. Stored energy values stay visible.";
}

function isLocked(
  row:
    | {
        legacyFieldId: string | null;
        migratedFieldId: string | null;
        migrationStatus: string | null;
      }
    | undefined,
): boolean {
  return (
    row !== undefined &&
    (row.legacyFieldId !== null || row.migratedFieldId !== null || row.migrationStatus !== null)
  );
}

function employeeCategoryLabel(reportingPeriodId: string, measure: string | null): string {
  if (measure === null || !EMPLOYEE_DECIMAL.test(measure.trim())) {
    return "Employee-size category not determined";
  }
  const classified = classifyEmployeeSize({
    reportingPeriodId,
    employeeMeasure: Number(measure),
    measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  });
  if (!classified.ok) {
    return "Employee-size category not determined";
  }
  if (classified.category === "EMPLOYEES_LE_10") {
    return "10 employees or fewer";
  }
  return "More than 10 employees";
}
