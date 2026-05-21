import { isRegisteredFieldId } from "../vsme.fieldRegistry";

/**
 * Explicit v1.0.0 scaffold → v2.0.0 canonical fieldId map.
 * See lib/vsme/SCHEMA_CHANGELOG.md for structural realignment (B3–B11).
 */
export const V1_TO_V2_FIELD_MAP: Readonly<Record<string, string>> = {
  // B3 energy (v1 B3 placeholders → v2 B3 electricity)
  B3_ELECTRICITY_RENEWABLE: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH",
  B3_ELECTRICITY_NON_RENEWABLE: "B3_ELECTRICITY_ELECTRICITY_NON_RENEWABLE_MWH",
  B3_ELECTRICITY_TOTAL: "B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH",
  B3_ENERGY_RENEWABLE: "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH",
  B3_ENERGY_NON_RENEWABLE: "B3_ELECTRICITY_ELECTRICITY_NON_RENEWABLE_MWH",
  B3_ENERGY_TOTAL: "B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH",
  B3_FUELS_RENEWABLE: "B3_FUELS_FUELS_RENEWABLE_MWH",
  B3_FUELS_NON_RENEWABLE: "B3_FUELS_FUELS_NON_RENEWABLE_MWH",
  B3_FUELS_TOTAL: "B3_FUELS_FUELS_TOTAL_MWH",
  B3_TOTAL_ENERGY: "B3_TOTALS_TOTAL_ENERGY_CONSUMPTION_MWH",

  // v1 B4 emissions → v2 B3 GHG
  B4_SCOPE1_TOTAL: "B3_GHG_SCOPE1_2_GROSS_SCOPE1_TCO2E",
  B4_SCOPE2_TOTAL: "B3_GHG_SCOPE1_2_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
  B4_SCOPE2_LOCATION: "B3_GHG_SCOPE1_2_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
  B4_SCOPE2_MARKET: "B3_GHG_SCOPE1_2_GROSS_SCOPE2_MARKET_BASED_TCO2E",
  B4_SCOPE3_TOTAL: "B3_GHG_SCOPE3_COMPREHENSIVE_GROSS_SCOPE3_TCO2E",
  B4_GHG_SCOPE1: "B3_GHG_SCOPE1_2_GROSS_SCOPE1_TCO2E",
  B4_GHG_SCOPE2: "B3_GHG_SCOPE1_2_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
  B4_GHG_SCOPE3: "B3_GHG_SCOPE3_COMPREHENSIVE_GROSS_SCOPE3_TCO2E",

  // v1 B5 water → v2 B6
  B5_WATER_WITHDRAWAL: "B6_WATER_WITHDRAWAL_TOTAL_WATER_WITHDRAWAL_M3",
  B5_WATER_CONSUMPTION: "B6_WATER_CONSUMPTION_WATER_CONSUMPTION_PRODUCTION_M3",
  B5_WATER_DISCHARGE: "B6_WATER_CONSUMPTION_TOTAL_WATER_DISCHARGE_M3",

  // v1 B6 waste → v2 B7
  B6_WASTE_TOTAL: "B7_WASTE_WASTE_NON_HAZARDOUS_TONNES",
  B6_WASTE_HAZARDOUS: "B7_WASTE_WASTE_HAZARDOUS_TONNES",
  B6_WASTE_RECYCLED: "B7_WASTE_WASTE_DIVERTED_RECYCLING_REUSE_TONNES",

  // v1 B7 workforce → v2 B8 / B1
  B7_EMPLOYEES_TOTAL: "B1_UNDERTAKING_METRICS_EMPLOYEES_HEADCOUNT",
  B7_EMPLOYEES_MALE: "B8_GENDER_EMPLOYEES_MALE",
  B7_EMPLOYEES_FEMALE: "B8_GENDER_EMPLOYEES_FEMALE",
  B7_EMPLOYEE_TURNOVER: "B8_TURNOVER_EMPLOYEE_TURNOVER_RATE",

  // v1 B8 health → v2 B9
  B8_WORK_ACCIDENTS: "B9_HEALTH_SAFETY_RECORDABLE_WORK_RELATED_ACCIDENTS",
  B8_FATALITIES: "B9_HEALTH_SAFETY_FATALITIES_WORK_RELATED_INJURIES",

  // v1 B9 training → v2 B10
  B9_TRAINING_HOURS: "B10_TRAINING_BY_GENDER_TRAINING_HOURS_FEMALE",

  // v1 B1 company metrics
  B1_EMPLOYEES: "B1_UNDERTAKING_METRICS_EMPLOYEES_HEADCOUNT",
  B1_LEGAL_FORM: "B1_UNDERTAKING_METRICS_LEGAL_FORM",
};

/** v1 ids with no v2 equivalent (removed or restructured beyond mapping). */
export const V1_LEGACY_ONLY_FIELD_IDS: ReadonlySet<string> = new Set([
  "B10_SUPPLY_CHAIN",
  "B10_SUPPLY_CHAIN_ASSESSMENT",
  "B11_BUSINESS_IMPACTS",
  "B11_IMPACT_DESCRIPTION",
]);

export type VsmeMigrationStatus = "migrated" | "legacy_only" | "unmapped";

export function isLegacyFieldId(fieldId: string): boolean {
  if (isRegisteredFieldId(fieldId)) {
    return false;
  }
  return (
    fieldId in V1_TO_V2_FIELD_MAP ||
    V1_LEGACY_ONLY_FIELD_IDS.has(fieldId) ||
    true
  );
}

/** Returns v2 fieldId when a known v1 id maps; otherwise null. */
export function mapLegacyFieldId(fieldId: string): string | null {
  if (isRegisteredFieldId(fieldId)) {
    return fieldId;
  }
  if (V1_LEGACY_ONLY_FIELD_IDS.has(fieldId)) {
    return null;
  }
  const mapped = V1_TO_V2_FIELD_MAP[fieldId];
  if (!mapped) {
    return null;
  }
  if (!isRegisteredFieldId(mapped)) {
    console.warn(
      `[LibreVS] v1ToV2FieldMap target not in registry: ${fieldId} → ${mapped}`
    );
    return null;
  }
  return mapped;
}

export function classifyLegacyFieldId(fieldId: string): VsmeMigrationStatus | null {
  if (isRegisteredFieldId(fieldId)) {
    return null;
  }
  if (V1_LEGACY_ONLY_FIELD_IDS.has(fieldId)) {
    return "legacy_only";
  }
  const mapped = mapLegacyFieldId(fieldId);
  return mapped ? "migrated" : "unmapped";
}
