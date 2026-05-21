export { VSME_SCHEMA } from "./vsme.schema";
export {
  VSME_FIELD_REGISTRY,
  VSME_FIELD_PATH_MAP,
  VSME_FIELD_IDS,
  VSME_FIELD_COUNT,
  getRegistryEntry,
} from "./vsme.fieldRegistry";
export { VSME_UI_SCHEMA, buildVsmeUiSchema } from "./vsme.uiSchema";
export { validateFieldId, assertValidFieldId } from "./validateField";
export { buildVsmePeriodSnapshot } from "./periodSnapshot";
export type { VsmeSchema, VsmeSectionDef, VsmeFieldDef } from "./vsme.types";
