import { VSME_SCHEMA } from "./vsme.schema";
import { VSME_SCHEMA_VERSION } from "./schemaVersion";
import {
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  VSME_FIELD_COUNT,
  VSME_FIELD_REGISTRY,
} from "./vsme.fieldRegistry";

const EXPECTED_TOTAL = 264;
const EXPECTED_B = 215;
const EXPECTED_C = 49;
const EXPECTED_SECTIONS = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B9",
  "B10",
  "B11",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
];

export type RegistryBootCheckResult = {
  ok: boolean;
  warnings: string[];
};

export function runRegistryBootCheck(): RegistryBootCheckResult {
  const warnings: string[] = [];

  if (VSME_FIELD_COUNT !== EXPECTED_TOTAL) {
    warnings.push(
      `field count ${VSME_FIELD_COUNT} !== expected ${EXPECTED_TOTAL}`
    );
  }
  if (VSME_B_FIELD_COUNT !== EXPECTED_B) {
    warnings.push(`B-module count ${VSME_B_FIELD_COUNT} !== expected ${EXPECTED_B}`);
  }
  if (VSME_C_FIELD_COUNT !== EXPECTED_C) {
    warnings.push(`C-module count ${VSME_C_FIELD_COUNT} !== expected ${EXPECTED_C}`);
  }

  const sectionCodes = VSME_SCHEMA.sections.map((s) => s.code);
  for (const code of EXPECTED_SECTIONS) {
    if (!sectionCodes.includes(code)) {
      warnings.push(`missing section ${code}`);
    }
  }

  const registryKeys = Object.keys(VSME_FIELD_REGISTRY);
  if (registryKeys.length !== VSME_FIELD_COUNT) {
    warnings.push("registry key count mismatch vs VSME_FIELD_COUNT");
  }

  if (VSME_SCHEMA.version !== VSME_SCHEMA_VERSION) {
    warnings.push(
      `schema version mismatch: schema=${VSME_SCHEMA.version} export=${VSME_SCHEMA_VERSION}`
    );
  }

  for (const warning of warnings) {
    console.warn(`[LibreVS] VSME registry boot check: ${warning}`);
  }

  if (warnings.length === 0 && process.env.NODE_ENV === "development") {
    console.info(
      `[LibreVS] VSME registry OK — ${VSME_FIELD_COUNT} fields (B=${VSME_B_FIELD_COUNT}, C=${VSME_C_FIELD_COUNT}), schema ${VSME_SCHEMA_VERSION}`
    );
  }

  return { ok: warnings.length === 0, warnings };
}
