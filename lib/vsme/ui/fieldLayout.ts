import type { VsmeUiField } from "@/components/vsme/types";
import {
  disclosureParagraphLabel,
  parseEntitySlot,
  type EntitySlotInfo,
} from "./fieldUx";

export type FieldLayoutItem =
  | { type: "disclosure"; paragraph: string; fields: VsmeUiField[] }
  | { type: "entity"; slot: EntitySlotInfo; fields: VsmeUiField[] }
  | { type: "field"; field: VsmeUiField };

export function buildFieldLayoutItems(fields: VsmeUiField[]): FieldLayoutItem[] {
  const items: FieldLayoutItem[] = [];
  const disclosureMap = new Map<string, VsmeUiField[]>();
  const entityMap = new Map<string, { slot: EntitySlotInfo; fields: VsmeUiField[] }>();
  const standalone: VsmeUiField[] = [];

  for (const field of fields) {
    const paragraph = field.efragParagraph?.trim();
    const entity = parseEntitySlot(field);

    if (entity) {
      const existing = entityMap.get(entity.key);
      if (existing) {
        existing.fields.push(field);
      } else {
        entityMap.set(entity.key, { slot: entity, fields: [field] });
      }
      continue;
    }

    if (paragraph) {
      const list = disclosureMap.get(paragraph) ?? [];
      list.push(field);
      disclosureMap.set(paragraph, list);
      continue;
    }

    standalone.push(field);
  }

  for (const [paragraph, groupFields] of disclosureMap) {
    if (groupFields.length >= 2) {
      items.push({ type: "disclosure", paragraph, fields: groupFields });
    } else {
      for (const f of groupFields) {
        standalone.push(f);
      }
    }
  }

  for (const { slot, fields: groupFields } of entityMap.values()) {
    items.push({ type: "entity", slot, fields: groupFields });
  }

  for (const field of standalone) {
    items.push({ type: "field", field });
  }

  return items;
}

export function disclosureGroupHeading(paragraph: string): string {
  return disclosureParagraphLabel(paragraph);
}
