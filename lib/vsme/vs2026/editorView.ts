/** Serializable editor view. The browser does not supply these definitions. */

export type EditorNumberRule = {
  integer: boolean;
  minimum: number | null;
  maximum: number | null;
  unitLabel: string | null;
};

export type EditorControl =
  | { kind: "text" }
  | { kind: "narrative" }
  | { kind: "boolean" }
  | { kind: "monetary" }
  | { kind: "legalForm" }
  | { kind: "naceCodes" }
  | { kind: "country" }
  | { kind: "coordinates" }
  | { kind: "url" }
  | { kind: "pollutantName" }
  | { kind: "number"; rule: EditorNumberRule }
  | { kind: "percentage"; rule: EditorNumberRule }
  | { kind: "enumeration"; members: { id: string; legalText: string }[] };

export type EditorFieldView = {
  id: string;
  label: string;
  paragraph: string;
  preparation: boolean;
  control: EditorControl;
  value: string | null;
  updatedAt: string | null;
  locked: boolean;
};

export type EditorUnavailableView = {
  id: string;
  label: string;
  paragraph: string;
  reason: string;
};

export type EditorRepeatingView = {
  id: string;
  statement: string;
  components: { id: string; label: string }[];
};

export type EditorDisclosureView = {
  id: string;
  title: string;
  fields: EditorFieldView[];
  unavailable: EditorUnavailableView[];
  repeating: EditorRepeatingView[];
};

export type EditorRepeatingCellView = {
  datapointId: string;
  label: string;
  paragraph: string;
  preparation: boolean;
  unavailableReason: string | null;
  control: EditorControl | null;
  dimensionMember: string;
  value: string | null;
  updatedAt: string | null;
  unitLabel: string | null;
  omissionConditionsAssessed?: boolean;
  omissionReassessedForPeriod?: boolean;
};

export type EditorRepeatingRowView = {
  id: string;
  position: number;
  parentRowId: string | null;
  parentLabel: string | null;
  cells: EditorRepeatingCellView[];
};

export type EditorSiteOption = {
  id: string;
  label: string;
};

export type EditorRepeatingGroupView = {
  id: string;
  disclosureId: string;
  statement: string;
  singleton: boolean;
  usesSite: boolean;
  categoryEntry: boolean;
  energyMembers: string[] | null;
  rows: EditorRepeatingRowView[];
  readOnlyNotice: string | null;
};

export type EditorReadyView = {
  reportingPeriodId: string;
  year: number | null;
  companyName: string | null;
  configurationStatus: "NOT_CONFIGURED" | "OPTION_A";
  additionalComprehensiveDisclosures: string[];
  employeeMeasure: string | null;
  employeeLocked: boolean;
  employeeCategoryLabel: string;
  disclosures: EditorDisclosureView[];
  repeatingGroups: EditorRepeatingGroupView[];
  sites: EditorSiteOption[];
  energyBreakdownLabel: string;
  omissionTargets: { id: string; label: string }[];
  omissionReasons: { point: "22(a)" | "22(b)" | "22(c)" | "22(d)"; text: string }[];
  comparativeBasis: "UNKNOWN" | "FIRST_YEAR" | "SUBSEQUENT";
  comparativeUpdatedAt: string | null;
  previewHref: string;
};

export type EditorMutationResult =
  | {
      ok: true;
      code: "SAVED" | "CLEARED";
      employeeCategory?: "EMPLOYEES_LE_10" | "EMPLOYEES_GT_10" | "NOT_PROVIDED";
      rowId?: string;
      updatedAt?: string | null;
    }
  | { ok: false; code: string; message: string };
