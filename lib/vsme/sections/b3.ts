import { field, section, subsection } from "../schemaHelpers";

export const B3_ENERGY_GHG = section(
  "B3_ENERGY_GHG",
  "B3",
  "Energy and greenhouse gas emissions",
  "B",
  [
    subsection("electricity", "Electricity consumption (paragraph 29)", [
      field(
        "electricity_renewable_mwh",
        "number",
        "EnergyConsumptionFromElectricityRenewable",
        "Environmental",
        "Electricity from renewable sources",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "electricity_non_renewable_mwh",
        "number",
        "EnergyConsumptionFromElectricityNonRenewable",
        "Environmental",
        "Electricity from non-renewable sources",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "electricity_total_mwh",
        "number",
        "EnergyConsumptionFromElectricity",
        "Environmental",
        "Total electricity (utility billings)",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "electricity_self_generated_mwh",
        "number",
        "EnergyConsumptionFromSelfGeneratedElectricity",
        "Environmental",
        "Self-generated electricity consumed",
        { efragParagraph: "83-84", unit: "MWh" }
      ),
    ]),
    subsection("fuels", "Fuels consumption (paragraph 29)", [
      field(
        "fuels_renewable_mwh",
        "number",
        "EnergyConsumptionFromFuelsRenewable",
        "Environmental",
        "Fuels from renewable sources",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "fuels_non_renewable_mwh",
        "number",
        "EnergyConsumptionFromFuelsNonRenewable",
        "Environmental",
        "Fuels from non-renewable sources",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "fuels_total_mwh",
        "number",
        "EnergyConsumptionFromFuels",
        "Environmental",
        "Total fuels consumption",
        { efragParagraph: "29", unit: "MWh" }
      ),
    ]),
    subsection("totals", "Total energy (paragraph 29)", [
      field(
        "total_energy_consumption_mwh",
        "number",
        "TotalEnergyConsumption",
        "Environmental",
        "Total energy consumption",
        { efragParagraph: "29", unit: "MWh" }
      ),
      field(
        "feedstock_fuel_non_energy_mwh",
        "number",
        "EnergyConsumptionFromFeedstocks",
        "Environmental",
        "Feedstocks / fuels not combusted for energy (optional)",
        { efragParagraph: "85", unit: "MWh" }
      ),
    ]),
    subsection("ghg_scope1_2", "GHG emissions Scope 1 and 2 (paragraph 30)", [
      field(
        "gross_scope1_tco2e",
        "number",
        "GrossScope1GreenhouseGasEmissions",
        "Environmental",
        "Gross Scope 1 GHG emissions",
        { efragParagraph: "30(a)", unit: "tCO2e" }
      ),
      field(
        "gross_scope2_location_based_tco2e",
        "number",
        "GrossLocationBasedScope2GreenhouseGasEmissions",
        "Environmental",
        "Gross Scope 2 GHG emissions (location-based)",
        { efragParagraph: "30(b)", unit: "tCO2e" }
      ),
      field(
        "gross_scope2_market_based_tco2e",
        "number",
        "GrossMarketBasedScope2GreenhouseGasEmissions",
        "Environmental",
        "Gross Scope 2 GHG emissions (market-based)",
        { efragParagraph: "30(b)", unit: "tCO2e" }
      ),
    ]),
    subsection("ghg_intensity", "GHG intensity (paragraph 31)", [
      field(
        "ghg_intensity_location_based",
        "number",
        "Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased",
        "Environmental",
        "Scope 1+2 GHG intensity (location-based) per turnover",
        { efragParagraph: "31", unit: "tCO2e/EUR" }
      ),
      field(
        "ghg_intensity_market_based",
        "number",
        "Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased",
        "Environmental",
        "Scope 1+2 GHG intensity (market-based) per turnover",
        { efragParagraph: "31", unit: "tCO2e/EUR" }
      ),
    ]),
    subsection("ghg_scope3_comprehensive", "Scope 3 GHG (paragraphs 50-53, if disclosed)", [
      field(
        "gross_scope3_tco2e",
        "number",
        "GrossScope3GreenhouseGasEmissions",
        "Environmental",
        "Gross Scope 3 GHG emissions (total)",
        { efragParagraph: "52-53", unit: "tCO2e" }
      ),
      field(
        "scope3_cat1_purchased_goods_tco2e",
        "number",
        "Scope3Category1PurchasedGoodsAndServices",
        "Environmental",
        "Scope 3 Category 1: Purchased goods and services",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat2_capital_goods_tco2e",
        "number",
        "Scope3Category2CapitalGoods",
        "Environmental",
        "Scope 3 Category 2: Capital goods",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat3_fuel_energy_tco2e",
        "number",
        "Scope3Category3FuelAndEnergyRelatedActivities",
        "Environmental",
        "Scope 3 Category 3: Fuel and energy related",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat4_upstream_transport_tco2e",
        "number",
        "Scope3Category4UpstreamTransportationAndDistribution",
        "Environmental",
        "Scope 3 Category 4: Upstream transport",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat5_waste_tco2e",
        "number",
        "Scope3Category5WasteGeneratedInOperations",
        "Environmental",
        "Scope 3 Category 5: Waste generated in operations",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat6_business_travel_tco2e",
        "number",
        "Scope3Category6BusinessTravel",
        "Environmental",
        "Scope 3 Category 6: Business travel",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat7_commuting_tco2e",
        "number",
        "Scope3Category7EmployeeCommuting",
        "Environmental",
        "Scope 3 Category 7: Employee commuting",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat9_downstream_transport_tco2e",
        "number",
        "Scope3Category9DownstreamTransportationAndDistribution",
        "Environmental",
        "Scope 3 Category 9: Downstream transport",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat11_use_of_sold_products_tco2e",
        "number",
        "Scope3Category11UseOfSoldProducts",
        "Environmental",
        "Scope 3 Category 11: Use of sold products",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat12_end_of_life_tco2e",
        "number",
        "Scope3Category12EndOfLifeTreatmentOfSoldProducts",
        "Environmental",
        "Scope 3 Category 12: End-of-life treatment",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
      field(
        "scope3_cat15_investments_tco2e",
        "number",
        "Scope3Category15Investments",
        "Environmental",
        "Scope 3 Category 15: Investments",
        { efragParagraph: "52", unit: "tCO2e" }
      ),
    ]),
  ]
);
