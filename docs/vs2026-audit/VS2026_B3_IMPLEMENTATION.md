# VS 2026 B3 registry

Phase 2D.2. Definitions are in `lib/vsme/vs2026/registry/b3.ts`. The running B3 section, calculations, and exports were not changed.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560, paragraphs 32, 33 and 49 to 52. Digital names come from the Phase 1B mapping of VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16. A recorded concept name is not upgraded when that mapping row is `UNVERIFIED`. No emission factors or conversion factors are stored.

## 1. Regulatory datapoint inventory

Annex I completion facts, class REGULATORY REQUIREMENT:

| Id | Paragraph | Reported unit |
| --- | --- | --- |
| `B3_TOTAL_ENERGY_CONSUMPTION_MWH` | 32, first sentence | MWh |
| `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` | 32 breakdown | MWh, dimensioned |
| `B3_ENERGY_CONSUMPTION_FROM_FUELS` | 32 breakdown | MWh, dimensioned |
| `B3_GROSS_SCOPE1_TCO2E` | 33(a) | tCO2eq |
| `B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E` | 33(b) | tCO2eq |

The electricity and fuels facts use two axes taken from the Annex I table: carrier (`Electricity (as reflected in utility billings)`, `Fuels`) and origin (`Renewable energy`, `Non-renewable energy`, `Total`). They apply only when the undertaking can obtain the breakdown. The total energy fact stays applicable when that information cannot be obtained.

Other definitions are not completion facts. See sections 6 and 7.

## 2. Existing VSME B3 fields examined

`lib/vsme/sections/b3.ts` has 26 fields: four electricity quantities, three fuel quantities, total energy, feedstock, Scope 1, location-based Scope 2, market-based Scope 2, two intensity metrics, a Scope 3 total, and eleven Scope 3 category slots. The section cites recommendation paragraphs 29 to 31 and 50 to 53. It was not edited.

## 3. Old-to-new mapping

| Previous fields | New definition |
| --- | --- |
| Renewable, non-renewable and total electricity | `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` |
| Renewable, non-renewable and total fuels | `B3_ENERGY_CONSUMPTION_FROM_FUELS` |
| Total energy | `B3_TOTAL_ENERGY_CONSUMPTION_MWH` |
| Scope 1 | `B3_GROSS_SCOPE1_TCO2E` |
| Location-based Scope 2 | `B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E` |
| Market-based Scope 2 | `B3_GROSS_SCOPE2_MARKET_BASED_TCO2E`, supplementary |
| Scope 3 total | `B3_GROSS_SCOPE3_TCO2E`, supplementary |
| Eleven Scope 3 category slots | `B3_SCOPE3_SIGNIFICANT_CATEGORIES`, an open list |

## 4. Obsolete fields

Not carried forward:

- `B3_GHG_INTENSITY_GHG_INTENSITY_LOCATION_BASED`
- `B3_GHG_INTENSITY_GHG_INTENSITY_MARKET_BASED`
- `B3_TOTALS_FEEDSTOCK_FUEL_NON_ENERGY_MWH`

Intensity is not an Annex I metric and the audit found no taxonomy concept. Feedstock that is not combusted for energy is not paragraph 32. It remains a double-counting safeguard in the calculation boundary, not a reported fact. The running fields are still in the old section.

## 5. New or changed definitions

`B3_ENERGY_BREAKDOWN_INFORMATION` records whether the undertaking can obtain the breakdown. It is INTERNAL PREPARATION DATA. `CANNOT_OBTAIN` is not zero, and an unassessed condition is not `CANNOT_OBTAIN`.

`B3_SCOPE1_SCOPE2_LOCATION_TOTAL` is a CALCULATED FACT from the digital calculation link. It is not a separate Annex I sentence. Market-based Scope 2 and Scope 3 are excluded from its inputs.

`B3_SELF_GENERATED_ELECTRICITY_MWH` is SUPPLEMENTARY INFORMATION. The template has a row. The Annex I table names utility electricity and fuels. That legal coverage stays unresolved.

## 6. Energy accounting treatment

REGULATORY REQUIREMENT: total consumption in MWh, plus the table when the information can be obtained.

EFRAG DIGITAL REQUIREMENT: `vs:TotalEnergyConsumption`, `vs:EnergyConsumptionFromElectricity` and `vs:EnergyConsumptionFromFuels` on `BreakdownOfEnergyConsumptionAxis`. The audit names `RenewableEnergyMember` on both the renewable and the non-renewable rows, so the non-renewable member QName is unresolved.

IMPLEMENTATION GUIDANCE, not a formula: purchased fuel is not added again as electricity generated from that fuel. Renewable electricity generated without combustion is not a second fuel quantity. Non-combusted feedstock is outside consumption. Input units stay unconverted until a verified factor exists. No conversion engine is implemented.

An empty breakdown cell is not zero. The paragraph 32 total is not defined as the sum of the breakdown, because the total is still required when the breakdown cannot be obtained.

## 7. GHG accounting treatment

REGULATORY REQUIREMENT: estimated absolute gross Scope 1 and location-based Scope 2, in tCO2eq, considering the GHG Protocol Corporate Accounting and Reporting Standard (2004). The two facts stay separate. No emission factors are stored, so the activity-data calculation is INCOMPLETE.

EFRAG DIGITAL REQUIREMENT: the verified concepts for those two facts, plus `vs:TotalGrossLocationBasedScope1AndScope2GHGEmissions` as a calculated total. That total is not an independent legal datapoint.

SUPPLEMENTARY INFORMATION: market-based Scope 2. The mapping file records the concept name with status `UNVERIFIED`. It is not a substitute for location-based Scope 2. Paragraph 33 does not require it, so it is outside completion.

SUPPLEMENTARY INFORMATION: Scope 3 under paragraphs 49 to 52. It is a sector consideration, not a Basic Module completion fact. The gross total uses the verified Scope 3 concept. Significant categories are an open list of the 15 GHG Protocol types named by paragraph 51. Category names are not reproduced and no category concept is invented. Paragraph 52 requires Scope 3, when disclosed, to be presented with B3. That presentation is recorded and not implemented.

## 8. Employee-size relief

Paragraphs 32 and 33 are marked voluntary for undertakings with 10 employees or fewer through `voluntaryForEmployeesLe10: true`. The same facts stay essential, with applicability `ALWAYS`, for the normal rule above that threshold. The relief is not an applicability state. Voluntary is not `NOT_APPLICABLE`, and a missing value is not zero.

The breakdown uses the same relief because it is inside paragraph 32. Scope 3 does not use that relief. The Annex II column is a separate lookup.

## 9. Annex II linkage

Membership is read from `annexII.ts`.

| Reference | 10 employees or fewer | More than 10 |
| --- | --- | --- |
| Paragraph 32, first sentence, total energy | Not a member | Member |
| Paragraph 33, estimated absolute gross GHG emissions | Not a member | Member |

Scope 1 and location-based Scope 2 share the paragraph 33 row. Breakdown cells, self-generated electricity, market-based Scope 2, the calculated total, and Scope 3 are not Annex II rows. Membership is not derived from the employee-size flag. The value-chain cap still depends on the request context, which this registry does not decide.

## 10. EFRAG taxonomy mappings

Verified QNames and period type `duration`: total energy, electricity, fuels, Scope 1, location-based Scope 2, Scope 3 gross total, and the Scope 1 plus location-based Scope 2 calculation. Item types remain unverified.

Unresolved: the breakdown-availability condition, self-generated electricity, market-based Scope 2, the non-renewable axis member, and every Scope 3 category. `ReportingScopesAxis` members recorded in the audit are current, baseline and target, not the 15 categories.

## 11. Knowledge Hub references

Paragraph pages verified in Phase 1B and copied in full:

- Paragraph 32: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/32`
- Paragraph 33: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/33`
- Paragraphs 49 to 52: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/49-52`

Each page is shared by the datapoints of that paragraph. The legal citation stays the Regulation ELI. The 2025 recommendation URL is not used. Intensity and feedstock have no published Knowledge Hub URL because they are not datapoints.

## 12. Calculation dependencies

| Output | Boundary |
| --- | --- |
| Total energy | Not implemented as a sum. Breakdown inputs are named only as a double-counting boundary. |
| Electricity and fuel totals inside the table | Missing cells are not zero. No conversion factor. |
| Scope 1 and location-based Scope 2 | Methodology reference is the 2004 Corporate Standard. Factors are absent, so the specification is incomplete. |
| Scope 1 plus location-based Scope 2 | Inputs are those two facts. Market-based Scope 2 and Scope 3 are excluded. The sum itself is not implemented. |
| Scope 3 total | Methodology reference is the Scope 3 standard. Factors are absent. |

## 13. Remaining uncertainties

- Whether self-generated electricity belongs in the paragraph 32 table.
- The non-renewable member QName. The audit text uses `RenewableEnergyMember` for both origin rows.
- Verification of the market-based Scope 2 concept. The name is recorded and the mapping status is `UNVERIFIED`.
- Which of the 15 Scope 3 category names and calculation methods to store. Paragraph 51 points to the GHG Protocol and does not list them.
- Activity-data units and country-specific factors. None are hardcoded.
- Paragraph 52 presentation with B3 is specified and not built.
