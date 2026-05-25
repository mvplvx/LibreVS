import type { VsmeUiField } from "@/components/vsme/types";

const NARRATIVE_NAME_PATTERN =
  /specification|description|awareness|list_of|listof|narrative|actions_|comments/i;

const ENTITY_SLOT_PATTERN =
  /^(subsidiary|site|pollutant|material)_(\d+)_/i;

/** Derive section code from canonical fieldId (e.g. B1_… → B1). */
export function sectionCodeFromFieldId(fieldId: string): string {
  const match = /^([BC]\d+)_/.exec(fieldId);
  return match?.[1] ?? "";
}

export function isB1Field(fieldId: string): boolean {
  return fieldId.startsWith("B1_");
}

/** B1 is foundational — no materiality decision UI. */
export function hidesMaterialityControls(fieldId: string): boolean {
  return isB1Field(fieldId);
}

export function isNarrativeField(field: VsmeUiField): boolean {
  if (field.type !== "string") {
    return false;
  }
  if (NARRATIVE_NAME_PATTERN.test(field.name)) {
    return true;
  }
  if ((field.description?.length ?? 0) > 100) {
    return true;
  }
  if (field.label.length > 60) {
    return true;
  }
  return false;
}

export type EntitySlotInfo = {
  kind: "subsidiary" | "site" | "pollutant" | "material";
  index: number;
  key: string;
  title: string;
};

export function parseEntitySlot(
  field: VsmeUiField
): EntitySlotInfo | null {
  const fromName = ENTITY_SLOT_PATTERN.exec(field.name);
  if (fromName) {
    const kind = fromName[1]!.toLowerCase() as EntitySlotInfo["kind"];
    const index = Number(fromName[2]);
    const labels: Record<EntitySlotInfo["kind"], string> = {
      subsidiary: "Subsidiary",
      site: "Site",
      pollutant: "Pollutant",
      material: "Material flow",
    };
    return {
      kind,
      index,
      key: `${kind}_${index}`,
      title: `${labels[kind]} ${index}`,
    };
  }
  return null;
}

export function disclosureParagraphLabel(paragraph: string): string {
  return `Disclosure §${paragraph}`;
}
