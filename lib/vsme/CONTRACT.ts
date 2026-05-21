/**
 * Phase 4F — canonical VSME runtime semantics (single source of truth).
 * Governance only: do not extend domain behaviour here.
 */
export const VSME_CONTRACT = {
  version: "2.0.0",

  fieldId: {
    type: "string",
    description: "Stable registry key (must exist in v2 registry)",
  },

  materiality: {
    material: "must be filled when in scope",
    non_material: "excluded from requiredToFill",
  },

  moduleScope: {
    B: "always_in_scope",
    C: "in_scope_if_employeeCount_gte_500",
  },

  requiredToFillRule:
    "requiredToFill = moduleInScope AND materiality === 'material'",

  coverage: {
    totalCoverage: "all_registry_fields",
    mandatoryCoverage: "requiredToFill_fields_only",
  },

  export: {
    source: "v2_only",
    excludeLegacy: true,
    deterministic: true,
  },
} as const;

/** Frozen registry cardinality (B1–B11 + C1–C9). */
export const VSME_CONTRACT_REGISTRY = {
  totalFields: 264,
  bModuleFields: 215,
  cModuleFields: 49,
} as const;

/**
 * Frozen KPI / coverage top-level metric keys (period snapshot APIs).
 * @see lib/vsme/CONTRACT_API.md
 */
export const VSME_CONTRACT_KPI_METRIC_KEYS = [
  "totalCoveragePercentage",
  "mandatoryCoveragePercentage",
  "exportReady",
] as const;

/** Allowed nested completeness keys on KPI-shaped payloads. */
export const VSME_CONTRACT_COMPLETENESS_KEYS = [
  "inScopeFieldIds",
  "materialFieldIds",
  "requiredFieldIds",
  "completedFieldIds",
  "missingRequiredFields",
  "missingMaterialFields",
  "exportBlockingFields",
] as const;

/**
 * Keys that must NOT appear at KPI/coverage root (semantic drift).
 * `missingFieldIds` belongs under export `validation` only.
 */
export const VSME_CONTRACT_DEPRECATED_API_KEYS = [
  "requiredCoveragePercentage",
  "missingMandatoryFieldIds",
  "missingFieldIds",
] as const;

/** Period intelligence routes must derive metrics via this pipeline only. */
export const VSME_CONTRACT_SNAPSHOT_PIPELINE = {
  loader: "loadPeriodIntelligence",
  builder: "buildVsmePeriodSnapshot",
  routes: [
    "app/api/reporting-period/[id]/kpis/route.ts",
    "app/api/reporting-period/[id]/vsme-coverage/route.ts",
    "app/api/reporting-period/[id]/export/route.ts",
    "app/api/reporting-period/[id]/dashboard/route.ts",
  ],
} as const;

export type VsmeContractKpiMetricKey =
  (typeof VSME_CONTRACT_KPI_METRIC_KEYS)[number];
