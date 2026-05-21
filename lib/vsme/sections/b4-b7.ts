import { field, section, subsection } from "../schemaHelpers";

const POLLUTANT_SLOTS = 8;
const MATERIAL_SLOTS = 5;

function pollutantSlot(slot: number) {
  const n = String(slot);
  return [
    field(`pollutant_${n}_name`, "string", `Pollutant${n}Name`, "Environmental", `Pollutant ${n} name`, {
      efragParagraph: "32",
    }),
    field(`pollutant_${n}_emissions_to_air`, "number", `Pollutant${n}EmissionsToAir`, "Environmental", `Pollutant ${n} emissions to air`, {
      efragParagraph: "32",
      unit: "kg",
    }),
    field(`pollutant_${n}_emissions_to_water`, "number", `Pollutant${n}EmissionsToWater`, "Environmental", `Pollutant ${n} emissions to water`, {
      efragParagraph: "32",
      unit: "kg",
    }),
    field(`pollutant_${n}_emissions_to_soil`, "number", `Pollutant${n}EmissionsToSoil`, "Environmental", `Pollutant ${n} emissions to soil`, {
      efragParagraph: "32",
      unit: "kg",
    }),
  ];
}

function materialFlowSlot(slot: number) {
  const n = String(slot);
  return [
    field(`material_${n}_name`, "string", `NameOfMaterialUsed${n}`, "Environmental", `Material ${n} name`, {
      efragParagraph: "38(c)",
    }),
    field(`material_${n}_weight_kg`, "number", `WeightOfMaterialUsed${n}`, "Environmental", `Material ${n} weight`, {
      efragParagraph: "38(c)",
      unit: "kg",
    }),
    field(`material_${n}_volume_m3`, "number", `VolumeOfMaterialUsed${n}`, "Environmental", `Material ${n} volume`, {
      efragParagraph: "38(c)",
      unit: "m3",
    }),
  ];
}

export const B4_POLLUTION = section(
  "B4_POLLUTION",
  "B4",
  "Pollution of air, water and soil",
  "B",
  [
    subsection("pollution_reference", "Public disclosure reference (paragraph 32)", [
      field(
        "pollution_public_disclosure_url",
        "string",
        "URLOrLinkToThePubliclyAvailableDisclosure",
        "Environmental",
        "URL to publicly available pollution disclosure",
        { efragParagraph: "32" }
      ),
      field(
        "pollution_not_required_by_law",
        "boolean",
        "PollutionNotRequiredByLawOrRegulation",
        "Environmental",
        "Not required to report pollutants by law",
        { efragParagraph: "32" }
      ),
    ]),
    subsection(
      "pollutants",
      "Pollutant emissions (paragraph 32)",
      Array.from({ length: POLLUTANT_SLOTS }, (_, i) => pollutantSlot(i + 1)).flat()
    ),
  ]
);

export const B5_BIODIVERSITY = section(
  "B5_BIODIVERSITY",
  "B5",
  "Biodiversity",
  "B",
  [
    subsection("biodiversity_sites", "Sites in biodiversity-sensitive areas (paragraph 33)", [
      field(
        "sites_in_biodiversity_sensitive_count",
        "number",
        "NumberOfSitesInBiodiversitySensitiveAreas",
        "Environmental",
        "Number of sites in/near biodiversity-sensitive areas",
        { efragParagraph: "33", unit: "count" }
      ),
      field(
        "sites_in_biodiversity_sensitive_area_ha",
        "number",
        "AreaOfSiteInBiodiversitySensitiveArea",
        "Environmental",
        "Area of sites in biodiversity-sensitive areas",
        { efragParagraph: "33", unit: "ha" }
      ),
      field(
        "sites_near_biodiversity_sensitive_count",
        "number",
        "NumberOfSitesNearBiodiversitySensitiveAreas",
        "Environmental",
        "Number of sites near biodiversity-sensitive areas",
        { efragParagraph: "33", unit: "count" }
      ),
    ]),
    subsection("land_use", "Land-use metrics (paragraph 34, optional)", [
      field("land_use_total_ha", "number", "TotalUseOfLand", "Environmental", "Total use of land", {
        efragParagraph: "34(a)",
        unit: "ha",
      }),
      field("land_sealed_area_ha", "number", "TotalSealedArea", "Environmental", "Total sealed area", {
        efragParagraph: "34(b)",
        unit: "ha",
      }),
      field("land_nature_oriented_on_site_ha", "number", "TotalNatureOrientedAreaOnSite", "Environmental", "Nature-oriented area on-site", {
        efragParagraph: "34(c)",
        unit: "ha",
      }),
      field("land_nature_oriented_off_site_ha", "number", "TotalNatureOrientedAreaOffSite", "Environmental", "Nature-oriented area off-site", {
        efragParagraph: "34(d)",
        unit: "ha",
      }),
    ]),
  ]
);

export const B6_WATER = section(
  "B6_WATER",
  "B6",
  "Water",
  "B",
  [
    subsection("water_withdrawal", "Water withdrawal (paragraph 35)", [
      field("total_water_withdrawal_m3", "number", "TotalWaterWithdrawal", "Environmental", "Total water withdrawal", {
        efragParagraph: "35",
        unit: "m3",
      }),
      field(
        "water_withdrawal_high_stress_m3",
        "number",
        "AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress",
        "Environmental",
        "Water withdrawal in high water-stress areas",
        { efragParagraph: "35", unit: "m3" }
      ),
    ]),
    subsection("water_consumption", "Water consumption (paragraph 36)", [
      field(
        "water_consumption_production_m3",
        "number",
        "WaterConsumptionFromProductionProcesses",
        "Environmental",
        "Water consumption from production processes",
        { efragParagraph: "36", unit: "m3" }
      ),
      field("total_water_discharge_m3", "number", "TotalWaterDischarge", "Environmental", "Total water discharge", {
        efragParagraph: "36",
        unit: "m3",
      }),
    ]),
  ]
);

export const B7_CIRCULAR_ECONOMY_WASTE = section(
  "B7_CIRCULAR_ECONOMY_WASTE",
  "B7",
  "Resource use, circular economy and waste management",
  "B",
  [
    subsection("circular_economy", "Circular economy (paragraph 37)", [
      field(
        "applies_circular_economy_principles",
        "boolean",
        "AppliesCircularEconomyPrinciples",
        "Environmental",
        "Applies circular economy principles",
        { efragParagraph: "37" }
      ),
      field(
        "circular_economy_description",
        "string",
        "DescriptionOfHowCircularEconomyPrinciplesAreApplied",
        "Environmental",
        "How circular economy principles are applied",
        { efragParagraph: "37" }
      ),
    ]),
    subsection("waste", "Waste (paragraph 38)", [
      field("waste_non_hazardous_tonnes", "number", "TotalWasteGeneratedNonHazardous", "Environmental", "Non-hazardous waste generated", {
        efragParagraph: "38(a)",
        unit: "tonnes",
      }),
      field("waste_hazardous_tonnes", "number", "TotalWasteGeneratedHazardous", "Environmental", "Hazardous waste generated", {
        efragParagraph: "38(a)",
        unit: "tonnes",
      }),
      field(
        "waste_diverted_recycling_reuse_tonnes",
        "number",
        "TotalWasteDivertedToRecyclingOrReuse",
        "Environmental",
        "Waste diverted to recycling or reuse",
        { efragParagraph: "38(b)", unit: "tonnes" }
      ),
    ]),
    subsection(
      "material_flows",
      "Material flows (paragraph 38(c))",
      Array.from({ length: MATERIAL_SLOTS }, (_, i) => materialFlowSlot(i + 1)).flat()
    ),
  ]
);
