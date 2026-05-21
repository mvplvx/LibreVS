import type {
  VsmeFieldDef,
  VsmeSectionDef,
  VsmeSubsectionDef,
} from "./vsme.types";

export type EfragExcelSheet =
  | "General"
  | "Environmental"
  | "Social"
  | "Governance";

export function field(
  name: string,
  type: VsmeFieldDef["type"],
  xbrlNamedRange: string,
  sheet: EfragExcelSheet,
  label: string,
  options?: {
    unit?: string;
    description?: string;
    efragParagraph?: string;
  }
): VsmeFieldDef {
  return {
    name,
    type,
    excelCell: `${sheet}!${xbrlNamedRange}`,
    xbrlNamedRange,
    excelSheet: sheet,
    label,
    unit: options?.unit,
    description: options?.description ?? label,
    efragParagraph: options?.efragParagraph,
  };
}

export function subsection(
  id: string,
  title: string,
  fields: VsmeFieldDef[]
): VsmeSubsectionDef {
  return { id, title, fields };
}

export function section(
  id: string,
  code: string,
  title: string,
  module: "B" | "C",
  subsections: VsmeSubsectionDef[]
): VsmeSectionDef {
  const applicabilityRule = module === "B" ? "always" : "if_employee_count_gt_500";
  return {
    id,
    code,
    title,
    module,
    schemaFidelity: "full",
    applicabilityRule,
    subsections,
  };
}

/** Repeatable row slot helper for EFRAG template expandable tables. */
export function siteSlotFields(
  slot: number,
  sheet: EfragExcelSheet,
  prefix: string
): VsmeFieldDef[] {
  const n = String(slot);
  return [
    field(`${prefix}_site_${n}_name`, "string", `${prefix}Site${n}Name`, sheet, `Site ${n} name`, {
      efragParagraph: "24(e)(vii)",
      description: "Site name for geolocation table row",
    }),
    field(`${prefix}_site_${n}_address`, "string", `${prefix}Site${n}Address`, sheet, `Site ${n} address`, {
      efragParagraph: "73",
    }),
    field(`${prefix}_site_${n}_postal_code`, "string", `${prefix}Site${n}PostalCode`, sheet, `Site ${n} postal code`, {
      efragParagraph: "73",
    }),
    field(`${prefix}_site_${n}_city`, "string", `${prefix}Site${n}City`, sheet, `Site ${n} city`, {
      efragParagraph: "73",
    }),
    field(`${prefix}_site_${n}_country`, "string", `${prefix}Site${n}Country`, sheet, `Site ${n} country`, {
      efragParagraph: "73",
    }),
    field(
      `${prefix}_site_${n}_latitude`,
      "number",
      `${prefix}Site${n}Latitude`,
      sheet,
      `Site ${n} latitude`,
      { efragParagraph: "75" }
    ),
    field(
      `${prefix}_site_${n}_longitude`,
      "number",
      `${prefix}Site${n}Longitude`,
      sheet,
      `Site ${n} longitude`,
      { efragParagraph: "75" }
    ),
  ];
}

export function subsidiarySlotFields(slot: number): VsmeFieldDef[] {
  const n = String(slot);
  return [
    field(`subsidiary_${n}_name`, "string", `Subsidiary${n}Name`, "General", `Subsidiary ${n} name`, {
      efragParagraph: "24(d)",
    }),
    field(
      `subsidiary_${n}_registered_address`,
      "string",
      `Subsidiary${n}RegisteredAddress`,
      "General",
      `Subsidiary ${n} registered address`,
      { efragParagraph: "24(d)" }
    ),
  ];
}
