import { VSME_SCHEMA } from "@/lib/vsme/vsme.schema";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import {
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  VSME_FIELD_COUNT,
} from "@/lib/vsme/vsme.fieldRegistry";
import { runRegistryBootCheck } from "@/lib/vsme/registryBootCheck";

const EXPECTED_B_SECTIONS = 11;
const EXPECTED_C_SECTIONS = 9;
const EXPECTED_FIELDS = 264;

export type RegistryHealthSnapshot = {
  fieldCount: number;
  bSections: number;
  cSections: number;
  bModuleFields: number;
  cModuleFields: number;
  schemaVersion: string;
  ok: boolean;
  warnings: string[];
};

export function countRegistrySections(): { bSections: number; cSections: number } {
  const bSections = VSME_SCHEMA.sections.filter((s) => s.module === "B").length;
  const cSections = VSME_SCHEMA.sections.filter((s) => s.module === "C").length;
  return { bSections, cSections };
}

/** Runtime registry validation — logs warnings on mismatch; read-only. */
export function validateRegistryAtRuntime(): RegistryHealthSnapshot {
  const boot = runRegistryBootCheck();
  const { bSections, cSections } = countRegistrySections();
  const warnings = [...boot.warnings];

  if (bSections !== EXPECTED_B_SECTIONS) {
    warnings.push(`B sections ${bSections} !== expected ${EXPECTED_B_SECTIONS}`);
  }
  if (cSections !== EXPECTED_C_SECTIONS) {
    warnings.push(`C sections ${cSections} !== expected ${EXPECTED_C_SECTIONS}`);
  }
  if (VSME_FIELD_COUNT !== EXPECTED_FIELDS) {
    warnings.push(
      `field count ${VSME_FIELD_COUNT} !== expected ${EXPECTED_FIELDS}`
    );
  }

  if (warnings.length > 0) {
    console.warn(
      `[LibreVS] Registry runtime validation: ${warnings.join("; ")}`
    );
  }

  return {
    fieldCount: VSME_FIELD_COUNT,
    bSections,
    cSections,
    bModuleFields: VSME_B_FIELD_COUNT,
    cModuleFields: VSME_C_FIELD_COUNT,
    schemaVersion: VSME_SCHEMA_VERSION,
    ok: warnings.length === 0,
    warnings,
  };
}
