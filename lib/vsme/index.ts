export { VSME_CONTRACT, VSME_CONTRACT_REGISTRY } from "./CONTRACT";
export { VSME_SCHEMA } from "./vsme.schema";
export { VSME_SCHEMA_VERSION } from "./schemaVersion";
export {
  VSME_FIELD_REGISTRY,
  VSME_FIELD_PATH_MAP,
  VSME_FIELD_IDS,
  VSME_FIELD_COUNT,
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  getRegistryEntry,
} from "./vsme.fieldRegistry";
export { buildVsmeUiSchema, getDefaultVsmeUiSchema } from "./vsme.uiSchema";
export { isUiSectionVisible } from "./sectionUiVisibility";
export { loadReportedFieldIds } from "./loadReportedFieldIds";
export { isRegisteredFieldId } from "./vsme.fieldRegistry";
export { warnLegacyFieldIds, partitionFieldIds } from "./legacyFieldIds";
export { runRegistryBootCheck } from "./registryBootCheck";
export {
  DATA_TRUTH_MODE,
  isV2FieldId,
  isLegacyStoredRow,
  filterLegacyDataPoints,
  assertV2Only,
} from "./runtime/dataTruthMode";
export {
  mapLegacyFieldId,
  isLegacyFieldId,
  classifyLegacyFieldId,
} from "./migration/v1ToV2FieldMap";
export {
  resolveEffectiveV2FieldId,
  buildLegacyDataSummary,
  classifyDataPointForMigration,
  type LegacyDataSummary,
  type VsmeStoredDataPoint,
} from "./migration/dataPointMigration";
export {
  VSME_SCHEMA_VERSION_LEGACY,
  resolveReportingPeriodSchemaVersion,
} from "./migration/schemaVersion";
export {
  requiresComprehensiveModule,
  isModuleCInReportingScope,
  isModuleInReportingScope,
  resolveSectionApplicability,
  getMandatoryFieldIdsForExport,
  COMPREHENSIVE_EMPLOYEE_THRESHOLD,
  COMPREHENSIVE_EMPLOYEE_MAX,
} from "./applicability";
export {
  DEFAULT_MATERIALITY,
  isRequiredToFill,
  getFieldMateriality,
  buildMaterialityMap,
  parseMateriality,
} from "./materiality";
export type { VsmeMateriality } from "./materiality";
export {
  buildExportRows,
  selectExportFieldIds,
  validateExportCompleteness,
} from "./exportMapping";
export { validateFieldId, assertValidFieldId } from "./validateField";
export { validateFieldValue } from "./validateFieldValue";
export { getMissingRequiredFieldIds } from "./validateRequired";
export {
  buildVsmeCompleteness,
  buildCompletedFieldIds,
  coveragePercentage,
} from "./completeness";
export type { VsmeCompleteness } from "./completeness";
export {
  getReportingState,
  getReportingStateFlags,
  valuesByFieldIdFromRows,
} from "./getReportingState";
export {
  validateEfragExport,
  buildEfragExportSnapshot,
  wouldFieldBeIncludedInExport,
  exportExclusionReason,
} from "./validateEfragExport";
export type {
  EfragExportSnapshot,
  ExportValidationResult,
} from "./validateEfragExport";
export { buildExportPreview, buildExportPreviewFromValues } from "./buildExportPreview";
export {
  assertPeriodExportNotLocked,
  createImmutableExportSnapshot,
  finalizeExportSnapshot,
  listExportSnapshotsForPeriod,
  buildExportSnapshotPayloads,
  ExportSnapshotLockedError,
} from "./exportSnapshotVersioning";
export type {
  ExportSnapshotAuditTrail,
  ExportSnapshotStatePayload,
} from "./exportSnapshotVersioning";
export type {
  ExportPreview,
  ExportPreviewField,
  ExportPreviewSection,
} from "./buildExportPreview";
export type {
  PeriodSnapshot,
  ReportingState,
} from "./getReportingState";
export {
  deriveReportingState,
  REPORTING_STATE_LABELS,
} from "./reportingState";
export type { VsmeReportingState as VsmeLegacyReportingState } from "./reportingState";
export { buildVsmePeriodSnapshot } from "./periodSnapshot";
export type {
  VsmeSchema,
  VsmeSectionDef,
  VsmeFieldDef,
  VsmeModule,
  VsmeApplicabilityRule,
} from "./vsme.types";
