# VS 2026 Basic Module integrity review

Review date: 25 November 2026. Scope: isolated registry `lib/vsme/vs2026/registry/` for B1–B11. No registry definition was changed.

Legal source: Commission Delegated Regulation (EU) 2026/1560, Annex I paragraphs 27–43 and Annex II. Digital names: the Phase 1B mapping of VS XBRL Taxonomy 2.0.0.

Verdict: **PASS WITH CONDITIONS**. The Basic Module disclosures are represented and internally consistent enough to design integration. The registry is not connected to runtime. Passing the 54 registry tests does not make a reporting period complete.

## Regulatory coverage

Requirement-to-definition reconciliation, not a count of fields:

| Annex I | Representation | Completion set |
| --- | --- | --- |
| 27(a) option and explicit compliance | `B1_MODULE_OPTION` reads `ReportingPeriod.vs2026ReportingOption`. The statement does not select the option | Annex I |
| 27(b) omitted disclosures | Repeating references, only when a paragraph 22 omission is used | Annex I, conditional |
| 27(c) individual or consolidated basis | `B1_REPORTING_BASIS` | Annex I and Annex II |
| 27(e) undertaking information, including employees | Scalars plus open subsidiary and site groups | Annex I. Annex II is the three canonical B1 rows only |
| 28 | Basis-for-preparation remainder already in the B1 registry | Annex I, not an Annex II row |
| 29–31 practices, policies, initiatives | Conditional B2 facts. Three cooperative items are guidance paragraph 15, outside Annex I | B2 Annex I facts. Guidance excluded |
| 32–33 energy and GHG | Total energy, obtainable breakdown, Scope 1 and location-based Scope 2. Intensity is absent. Market-based Scope 2 and Scope 3 are supplementary | Paragraph 32 first sentence and paragraph 33 |
| 34 pollution | Condition, method, public reference or open pollutant rows | Annex I when the condition applies. Not Annex II |
| 35 biodiversity | Site reference to `B1_SITE`, open area relationships | Annex I when a relationship is identified. Not Annex II |
| 36–37 water | Withdrawal separate from consumption. Stress consumption is separate. Discharge is an input | Paragraph 36 is the only B6 Annex II row |
| 38–39 circular economy and waste | Whether, conditional how, hazardous and non-hazardous weights, one legal proportion, open materials | 38 first sentence, 39(a) and 39(b) are Annex II for more than 10 employees. 39(c) is not |
| 40 workforce | Contract, gender, conditional open country list. Turnover is not here | 40(a) and 40(b) are Annex II for both profiles. 40(c) is not |
| 41 health and safety | Accident count and rate separate. One fatality total. No size relief | 41(a) is Annex II for both profiles. 41(b) is not |
| 42 remuneration, bargaining, training | Wage response, conditional pay gap, one coverage percentage, one training average | 42(a), 42(c), 42(d) are Annex II for both profiles. 42(b) is not |
| 43 convictions and fines | Two quantities. No size relief. Not Annex II | Annex I, event-conditional |

Checked by reading the registry and the legal fixtures, then executing the definitions: 112 datapoints, 0 duplicate ids, no `2025/1710` or `2025-07-30-ec-rec` string in the registry sources. Employee-size relief matches the square-bracket pattern already tested: B3 paragraphs 32–33 (not Scope 3), B6, and B7 use `voluntaryForEmployeesLe10: true`. B1, B2, B4, B5, B8, B9, B10, and B11 do not. Annex II membership is read from `annexII.ts`, not from that flag.

B1 and B2 do not set `informationClass`. Their Annex I set is the 27 facts from Phase 2D.1. Later sections use `REGULATORY_FACT` for completion. Preparation, supplementary, digital, and the one calculated total are outside that filter where the class is set. The three B2 guidance datapoints stay outside Annex I.

Paragraphs 14 and 18 are not B1–B11 facts. That is a recorded deferral, not a missing Basic disclosure. See the conditions below.

## Cross-disclosure consistency

| Relationship | Class | Reason |
| --- | --- | --- |
| `vs2026ReportingOption` and `B1_MODULE_OPTION` | DERIVED_FACT | The period column is the only writable option. The B1 fact must be read from `getReportingConfiguration` |
| Paragraph 25 additional C ids | PREPARATION_STATE | Stored on the period. They do not change Option A into Option B |
| `Company.employeeCount` | INDEPENDENT_FACT | It still drives the running 500 rule. It is not the Phase 2A measure `VS2026_EMPLOYEE_PROPORTIONALITY` and not `B1_EMPLOYEES` |
| `B1_EMPLOYEES` and `B1_EMPLOYEE_COUNTING_METHODOLOGY` | INDEPENDENT_FACT | One paragraph 27(e)(v) number and its basis. Not the size classifier |
| `B8_MEASUREMENT_BASIS` | PREPARATION_STATE | Reuses the B1 member ids. It may differ from the B1 basis |
| B8 contract, gender, and country counts | INDEPENDENT_FACT | Paragraph 40 breakdowns. Equal to `B1_EMPLOYEES` only when period, boundary, and basis match. The engine must not enforce equality |
| B10 coverage denominator and training headcount | CALCULATION_INPUT | Headcount for those formulas. A B8 headcount may be copied only when the basis is headcount and the period and boundary match. FTE is not a valid copy |
| `B1_SITE` row | SHARED_CANONICAL_FACT | The only site inventory |
| B5 site reference and B6 water-stress site reference | REFERENCE_RELATIONSHIP | Point at a `B1_SITE` row. They do not create a site |
| B3 total energy and the electricity or fuel breakdown | INDEPENDENT_FACT | The total is not defined as the sum of the breakdown |
| B3 Scope 1, location-based Scope 2, and their total | DERIVED_FACT | The total's inputs are those two quantities. Market-based Scope 2 and Scope 3 are excluded. Formula not implemented |
| B6 withdrawal, production-process withdrawal, discharge, consumption | CALCULATION_INPUT plus INDEPENDENT_FACT | Paragraph 36 withdrawal is not an input to paragraph 37 unless a later check proves the same boundary and period. Missing discharge is not zero |
| B6 stress total and per-site consumption | CALCULATION_INPUT | Per-site rows attribute the reported amount. They are not summed in the registry |
| B7 hazardous, non-hazardous, and total weight | CALCULATION_INPUT | Total is not summed here. Missing component is not zero |
| B7 legal proportion and the two mass percentages | INDEPENDENT_FACT plus CALCULATION_INPUT | One legal output. The two taxonomy percentages are digital inputs and are not added |
| B7 material weight and volume | INDEPENDENT_FACT | Volume is digital and is not added to weight |
| `Company.currency` | SHARED_CANONICAL_FACT | Reporting currency for B1 turnover and balance sheet, B10 remuneration inputs, and B11 fines. No per-fact currency and no FX |
| B9 accident count, hours, basis, and rate | CALCULATION_INPUT | The rate is also a reported fact. It is not calculated yet. Zero hours are not a valid rate |
| B9 fatality components and the combined total | CALCULATION_INPUT | One legal total. Components are not added without an overlap check |
| B11 count and amount | INDEPENDENT_FACT | Separate events. Neither is derived from the other |
| Paragraph 22 omission and B4 or B11 conditions | PREPARATION_STATE | An omission is not an applicability result. A B11 legal restriction is not a paragraph 22 omission. `non_material` is neither |

## Verified problems

These are integration defects. They are not missing Annex I sentences.

| Id | Class | Finding |
| --- | --- | --- |
| INT-1 | IMPLEMENTATION_BLOCKER | `SustainabilityDataPoint` is unique on `(reportingPeriodId, fieldId)` and stores one string. The eight open groups cannot be stored as additional rows of the same field id |
| INT-2 | IMPLEMENTATION_BLOCKER | Running scope, completeness, UI, and export still use `employeeCount >= 500` and `non_material`. The stored VS 2026 option is unread |
| INT-3 | IMPLEMENTATION_BLOCKER | `ReportingPeriod.schemaVersion` default `2.0.0` is the running VSME label. Deployment smoke asserts that string. It must not be reused as the switch to this registry |
| INT-4 | INTEROPERABILITY_GAP | Twelve Annex I facts have no verified item QName: `B1_SITE_IDENTIFIER`, four B2 existence facts, `B4_POLLUTANT_IDENTITY`, two B5 relationship facts, and four B7 waste facts including the legal proportion. See the mapping section of the cutover plan |
| INT-5 | NON_BLOCKING_ENHANCEMENT | B1 and B2 omit `informationClass`, so a single completion filter cannot yet see all 67 Annex I facts |
| INT-6 | NON_BLOCKING_ENHANCEMENT | `B10_TOTAL_TRAINING_HOURS` reuses the hours-average value shape. It is preparation data. A calculator must not treat it as the paragraph 42(d) result |

No `REGULATORY_BLOCKER` requiring a registry edit was found. Obsolete 2025 metrics that were removed in earlier phases (GHG intensity, land-use hectares, gender-split training averages, B8 turnover, five-slot countries, five-slot materials, eight-slot pollutants) are not registry ids.

## Remaining uncertainties

Classified for implementation. None of them invents a new disclosure.

| Topic | Class | Pilot effect |
| --- | --- | --- |
| Several wage arrangements rolled into one paragraph 42(a) answer | Unresolved legal interpretation | Does not block a pilot that stores one response plus the determination and does not compute the rollup |
| Paragraph 43 "and" when only one of convictions or fines occurred | Unresolved legal interpretation | Does not block a pilot that keeps the metrics independent and does not write zero |
| B8 basis versus B10 headcount | Resolved as a non-equality rule | Blocked only if a screen forces the numbers to match |
| Paragraph 39(b) versus the two taxonomy percentages | INTEROPERABILITY_GAP | The legal proportion can be entered. Do not add the percentages |
| Paragraph 14 comparatives and paragraph 18 unchanged references | Deferred general rules | A first period has no prior VS 2026 report. Leave both out of the pilot. Do not block B1–B11 entry |
| Accident-rate basis of 200 000 or 1 000 000 hours | NON-MANDATORY GUIDANCE | Collect the reported rate. Do not require a calculated rate |
| Pay-gap formula | NON-MANDATORY GUIDANCE | Collect the percentage when the legal obligation is assessed as present. Do not impose the guidance formula |

## Required corrections

Do not edit the registry in the review follow-up unless a later legal reading changes one of the uncertainties above.

1. Add `informationClass` to B1 and B2 when the completion filter is built, so guidance stays excluded. INT-5.
2. Give total training hours its own value kind before any training calculator runs. INT-6.
3. Persist repeating rows in new tables. Do not overload the scalar unique key. INT-1.
4. Switch scope, completeness, UI, and export in one change, after an evaluation result exists. INT-2.
5. Leave `schemaVersion` as the application label. Select the registry from the period option. INT-3.

## Verification

`npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts` on 25 November 2026: 54 passed, 0 failed. That run includes the reporting-configuration database test. It does not exercise the running VSME forms or exports.
