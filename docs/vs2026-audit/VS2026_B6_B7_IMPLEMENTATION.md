# VS 2026 B6 and B7 registry

Phase 2D.4. Definitions are in `lib/vsme/vs2026/registry/b6.ts` and `lib/vsme/vs2026/registry/b7.ts`. The running water and waste sections were not changed.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560, paragraphs 36 to 39, with Appendix A for water withdrawal, water consumption, water stress, circular economy principles, hazardous waste, and recycling. Digital names come from the Phase 1B mapping of VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16. A recorded concept name is not upgraded when that mapping row is `UNVERIFIED`.

## 1. Regulatory requirements

REGULATORY REQUIREMENT, paragraph 36. The undertaking discloses total water withdrawal: water drawn into the boundaries of the organisation or facility.

REGULATORY REQUIREMENT, paragraph 37. If production processes significantly consume water, the undertaking discloses water consumption as the difference between withdrawal and discharge from those production processes, and separately the water consumed at sites in areas with water stress. The examples, including drying, power production, production of goods, and agricultural irrigation, are not a closed list.

REGULATORY REQUIREMENT, paragraph 38. The undertaking discloses whether it applies circular economy principles and, if so, how.

REGULATORY REQUIREMENT, paragraph 39(a). Total weight of waste generated, with a hazardous and non-hazardous breakdown.

REGULATORY REQUIREMENT, paragraph 39(b). One proportion of waste diverted to recycling or preparation for reuse.

REGULATORY REQUIREMENT, paragraph 39(c). If the undertaking uses significant material flows, the annual mass-flow of relevant materials. Manufacturing, construction, and packaging are examples.

## 2. Legacy fields examined

`lib/vsme/sections/b4-b7.ts` was read and not edited.

B6 has 4 fields: total withdrawal in m3, withdrawal in high water-stress areas, consumption from production, and total discharge. The section cites recommendation paragraphs 35 and 36. The stress field is withdrawal, not consumption.

B7 has 20 fields: a circular-economy boolean, a description, non-hazardous tonnes, hazardous tonnes, one diverted mass in tonnes, and five fixed material slots with name, kilograms, and cubic metres. The section cites recommendation paragraphs 37 and 38. There is no separate total waste weight and no percentage.

## 3. New canonical definitions

Annex I completion facts, class REGULATORY REQUIREMENT:

| Id | Paragraph | Unit |
| --- | --- | --- |
| `B6_TOTAL_WATER_WITHDRAWAL_M3` | 36 | m3 |
| `B6_WATER_CONSUMPTION_PRODUCTION_M3` | 37 | m3 |
| `B6_WATER_CONSUMED_WATER_STRESS_M3` | 37 | m3 |
| `B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES` | 38, whether | YES or NO |
| `B7_CIRCULAR_ECONOMY_DESCRIPTION` | 38, how | narrative |
| `B7_WASTE_GENERATED_TOTAL_WEIGHT` | 39(a) | weight |
| `B7_WASTE_HAZARDOUS_MASS` | 39(a) | weight |
| `B7_WASTE_NON_HAZARDOUS_MASS` | 39(a) | weight |
| `B7_WASTE_DIVERTED_PROPORTION` | 39(b) | percent |
| `B7_MATERIAL_NAME` | 39(c) | text |
| `B7_MATERIAL_WEIGHT` | 39(c) | weight |

PREPARATION DATA: the water-process condition, production-process withdrawal, production-process discharge, water-stress site reference, water-stress assessment, per-site stress consumption, and the significant-material-flow condition.

DIGITAL INTEROPERABILITY REQUIREMENT: `B7_WASTE_RECYCLING_PERCENT_MASS`, `B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS`, and `B7_MATERIAL_VOLUME`. They are outside the single legal proportion and outside the legal mass-flow unit.

Nine B6 definitions and twelve B7 definitions are not twenty-one XBRL concepts.

## 4. Old-to-new mapping

| Previous field | New definition |
| --- | --- |
| Total water withdrawal | `B6_TOTAL_WATER_WITHDRAWAL_M3` |
| Withdrawal in high water-stress areas | `B6_WATER_CONSUMED_WATER_STRESS_M3`, now consumption |
| Production consumption | `B6_WATER_CONSUMPTION_PRODUCTION_M3` |
| Total discharge | `B6_WATER_DISCHARGE_PRODUCTION_M3`, production-process input |
| Circular-economy boolean | `B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES`, YES / NO / unanswered |
| Circular-economy description | `B7_CIRCULAR_ECONOMY_DESCRIPTION` |
| Hazardous and non-hazardous tonnes | The two weight facts, plus a separate total |
| One diverted mass | One legal proportion, plus two digital mass percentages |
| Five material slots | Open group `B7_MATERIAL` |

## 5. Water accounting boundaries

REGULATORY REQUIREMENT: paragraph 36 withdrawal is an independent fact. Appendix A defines it as all water drawn into the undertaking from all sources over the reporting period.

REGULATORY REQUIREMENT: paragraph 37 consumption is withdrawal minus discharge from the production processes, for the same boundary and period. The formula is recorded and not implemented. Missing discharge is not zero. The paragraph 36 total is excluded from the inputs unless a later engine shows that its boundary and period are the production-process boundary.

PREPARATION DATA: `B6_PRODUCTION_PROCESS_WITHDRAWAL_M3` is that production-process input. No separate item concept was verified for it, so it is not given the paragraph 36 QName.

The reported water unit is m3, from the audited template unit. Another input unit stays unconverted until a verified factor exists. The reporting period is the duration of the fact.

## 6. Water-stress treatment

REGULATORY REQUIREMENT: water consumed at sites in areas with water stress is a separate fact from total withdrawal. It applies to undertakings that have the paragraph 37 processes.

The sites are references to `B1_SITE`. The list is open. An assessment is `IN_WATER_STRESS` or `NOT_IN_WATER_STRESS`. An absent assessment is unassessed, not a finding that the site is free from water stress.

PREPARATION DATA: the per-site consumption attributes the reported amount and is not summed in this phase.

NON-MANDATORY GUIDANCE is not turned into a threshold. Appendix A describes water stress as availability, quality, and accessibility. No geographic service or hardcoded classification is applied.

DIGITAL INTEROPERABILITY REQUIREMENT: `vs:AmountOfWaterConsumedAtSitesLocatedInAreasWithWaterStress` is kept. The taxonomy reference linkbase has an empty paragraph for that concept. The legal reference remains paragraph 37. A pollutant concept referenced to paragraph 37 does not replace it.

## 7. Circular economy conditions

The whether-question is always part of paragraph 38. Members are YES and NO. An unanswered value is not NO. YES does not generate the description.

The description applies only when the answer is YES. It is Annex I text and is outside the Annex II first sentence.

Appendix A states the three principles. They are the definition, not a checklist of mandatory activities.

## 8. Waste reporting structure

Hazardous and non-hazardous waste are separate weight facts. The total weight is a third reported fact. They are not one narrative.

Appendix A points to Annex III of Directive 2008/98/EC for hazardous properties. Those properties are not copied into members.

The total is not calculated here. Future checks require no overlap, the same weight unit and period, missing components not treated as zero, reported zero kept distinct from missing data, and no addition of incompatible units. Volume companions mentioned in the audit were not verified and are not stored. Waste-type member QNames are not invented.

## 9. Recycling and preparation for reuse

REGULATORY REQUIREMENT: paragraph 39(b) is one proportion. `B7_WASTE_DIVERTED_PROPORTION` is that output. Annex II has one row for it.

DIGITAL INTEROPERABILITY REQUIREMENT: the taxonomy has `vs:PercentageOfWasteDivertedToRecyclingMass` and `vs:PercentageOfWasteDivertedToPreparationForReuseMass`. They stay separate and are not a second and third legal sentence. They are not added together. A quantity in both treatments would be double counted, so overlap is a future check rather than a silent sum.

The proportion is not calculated. A missing numerator is not zero. A missing denominator is not zero percent. A zero denominator is not a valid percentage. Numerator, denominator, unit, and period must match before any later formula runs.

Appendix A recycling excludes energy recovery and backfilling. Preparation for reuse of waste is not the Appendix A reuse of products that are not waste. The Annex II topic says "recycling or reuse"; the registry keeps that exact reference and uses the Annex I phrase "preparation for reuse" for the disclosure.

## 10. Material mass-flow structure

The condition is significant material flows in the undertaking's activities. An empty assessment is unassessed. An industry code does not select it. The examples are not a closed list.

The material group has no maximum. Each row has an identity, a weight, and a digital volume companion. Weight is the legal mass-flow. Volume is not added to weight.

Purchased material, internally sourced material, and material used in production are named as boundaries. No formula is stored for them. Material member names are not reproduced. `IdentifierOfMaterialTypedAxis` is an axis, not an item concept.

## 11. Employee-size relief

Paragraphs 36 to 39 use `voluntaryForEmployeesLe10: true`. The relief is separate from requirement type and from applicability. Paragraph 36 withdrawal stays essential and always applicable. For 10 employees or fewer the same facts are voluntary. Voluntary is not an applicability state. Above 10 employees the ordinary conditions apply. The registry does not read `Company.employeeCount`.

## 12. Annex II membership

Membership is read from the Phase 2A dataset.

| Canonical reference | 10 employees or fewer | More than 10 |
| --- | --- | --- |
| Para 36 | Not a member | Member |
| Para 38, first sentence | Not a member | Member |
| Para 39, point (a) | Not a member | Member |
| Para 39, point (b) | Not a member | Member |

Paragraph 37, the circular-economy description, paragraph 39(c), the two digital percentages, and material volume are not Annex II rows. The two percentage rows in the migration matrix are marked included for more than 10 employees because they express paragraph 39(b). The canonical table has one 39(b) row, and only the legal proportion carries it. Listing in Annex II does not decide that the value-chain cap applies to a request.

## 13. EFRAG mappings

Verified:

| Concept | Fact |
| --- | --- |
| `vs:TotalAmountOfWaterWithdrawnFromAllSites` | Total withdrawal |
| `vs:TotalWaterConsumption` | Production-process consumption |
| `vs:WaterDischargeFromUndertakingProductionProcesses` | Discharge input |
| `vs:AmountOfWaterConsumedAtSitesLocatedInAreasWithWaterStress` | Water-stress consumption |
| `vs:UndertakingAppliesCircularEconomyPrinciples` | Whether circular principles apply |
| `vs:DescriptionOfHowCircularEconomyPrinciplesAreApplied` | How they apply |
| `vs:PercentageOfWasteDivertedToRecyclingMass` | Recycling percentage |
| `vs:PercentageOfWasteDivertedToPreparationForReuseMass` | Preparation-for-reuse percentage |
| `vs:NameOfMaterialUsed` | Material identity |
| `vs:WeightOfMaterialUsed` | Material mass-flow |
| `vs:VolumeOfMaterialUsed` | Material volume companion |

Unresolved, with no QName stored: the water-process condition, production-process withdrawal, water-stress site identity, water-stress assessment, per-site consumption, total waste weight, hazardous mass, non-hazardous mass, the single legal proportion, and the material-flow condition. Item types remain unverified. The pipe-joined concept cell on the old diverted-mass row is not stored as one QName.

## 14. Knowledge Hub references

Verified paragraph pages, pasted in full:

- Paragraph 36: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/36`
- Paragraph 37: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/37`
- Paragraph 38: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/38`
- Paragraph 39(b): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/39/b`
- Paragraph 39(c): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/39/c`

Paragraph 37 is shared, including the water-stress fact. That matrix row had no deep link of its own. Paragraph 39(a) has no publishable URL, so those facts keep the Regulation ELI. No 2025 recommendation URL is used.

## 15. Calculation dependencies

| Output | Inputs | Status |
| --- | --- | --- |
| Paragraph 37 consumption | Production-process withdrawal and production-process discharge | Incomplete. Excludes paragraph 36 withdrawal and the water-stress amount |
| Water-stress amount | Per-site consumption rows | Incomplete. Not summed |
| Total waste weight | Hazardous and non-hazardous weights | Boundary only. Not summed |
| Legal waste proportion | The two digital percentages and total waste weight | Incomplete. The percentages are not added |
| Each digital percentage | Total waste weight as the denominator candidate | Incomplete. Zero denominator is not a valid percentage |
| Material weight | None | Incomplete. Not added to volume |

No emission factors and no conversion factors are stored.

## 16. Remaining uncertainties

- The production-process withdrawal has no verified item concept, so it cannot yet be tied to the paragraph 36 concept without mixing boundaries.
- The water-stress concept's taxonomy reference paragraph is empty. The legal paragraph is 37.
- Hazardous and non-hazardous mass QNames, and any volume companions, were not verified.
- There is no verified single concept for the combined paragraph 39(b) proportion. How the two mass percentages relate to that one proportion, including overlap, is not calculated.
- Waste-type and material member lists are not reproduced.
- Purchased, internally sourced, and process-used materials have no verified formula.
- Paragraph 39(a) has no publishable Knowledge Hub URL.
- No geographic water-stress screening is implemented.
