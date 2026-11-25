# VS 2026 B10 and B11 registry

Phase 2D.6. Definitions are in `lib/vsme/vs2026/registry/b10.ts` and `lib/vsme/vs2026/registry/b11.ts`. The running workforce and governance sections were not changed.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560, paragraphs 42 and 43, with Appendix A for pay, collective bargaining, and training. Digital names come from the Phase 1B mapping of VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16.

## 1. Regulatory requirements

REGULATORY REQUIREMENT, paragraph 42. The undertaking discloses:

- (a) whether employees receive pay equal to or above the applicable minimum wage for the country it reports on, determined by national minimum-wage law or through a collective bargaining agreement;
- (b) the percentage pay gap between female and male employees, if the undertaking is already required by EU law or other national regulations to report it;
- (c) the percentage of employees covered by collective bargaining agreements;
- (d) the average number of annual training hours per employee.

REGULATORY REQUIREMENT, paragraph 43. In case of convictions and fines in the reporting period, the undertaking discloses the number of convictions and the total amount of fines incurred for violation of anti-corruption and anti-bribery laws.

## 2. Existing VSME fields examined

`lib/vsme/sections/b8-b11.ts` was read and not edited.

B10 has 7 fields: a minimum-wage boolean, a gender pay-gap percentage, a collective-bargaining percentage, and four gender-specific training-hour averages. The section cites recommendation paragraph 42.

B11 has 2 fields: a conviction count and a fine amount hardcoded in euro. The section cites recommendation paragraph 43.

## 3. Old-to-new mapping

| Previous field | New definition |
| --- | --- |
| Pay at or above minimum wage | `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE`, with a separate determination |
| Gender pay-gap percentage | `B10_GENDER_PAY_GAP_PERCENT`, conditional on a legal reporting obligation |
| Collective-bargaining percentage | `B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT` |
| Four gender training averages | One average, `B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE` |
| Conviction count | `B11_CONVICTIONS_COUNT` |
| Fine amount in euro | `B11_FINES_AMOUNT` in the reporting currency |

## 4. New VS 2026 definitions

Annex I completion facts, class REGULATORY REQUIREMENT:

| Id | Paragraph |
| --- | --- |
| `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE` | 42(a) |
| `B10_GENDER_PAY_GAP_PERCENT` | 42(b) |
| `B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT` | 42(c) |
| `B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE` | 42(d) |
| `B11_CONVICTIONS_COUNT` | 43 |
| `B11_FINES_AMOUNT` | 43 |

PREPARATION DATA: the minimum-wage determination, the pay-gap legal obligation, average female remuneration, average male remuneration, covered employees, the coverage headcount, total training hours, the training headcount, and the convictions-and-fines assessment.

Twelve B10 definitions and three B11 definitions are not fifteen XBRL concepts.

## 5. Minimum-wage applicability

CONDITIONAL APPLICABILITY: the yes-or-no fact applies when an applicable minimum remuneration has been identified.

PREPARATION DATA distinguishes statutory minimum wage, collectively agreed minimum remuneration, no applicable minimum identified after assessment, an unresolved determination, and an unanswered assessment. An unanswered assessment is unassessed. It is not a no, and it is not a finding that no minimum exists.

Absence of a general statutory minimum wage is not a negative result. The response concerns whether applicable minimum remuneration is met.

## 6. Statutory versus collectively agreed minimum remuneration

REGULATORY REQUIREMENT: paragraph 42(a) names both national minimum-wage law and a collective bargaining agreement.

Those two sources stay separate in the determination. The verified digital fact is one response: met or not met. The taxonomy boolean does not store an unassessed value, so an empty response is not serialised as false.

EFRAG DIGITAL REQUIREMENT: `vs:EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement`.

The registered country is not every employee's wage rule. `B8_EMPLOYMENT_CONTRACT_COUNTRY` remains the country inventory. No second country list is created. How several countries or agreements combine into the one verified fact is unresolved.

NON-MANDATORY GUIDANCE paragraphs 121–122 discuss minimum wage. They do not add a legal exemption.

## 7. Gender-pay-gap legal applicability

CONDITIONAL APPLICABILITY: paragraph 42(b) applies when the undertaking is already required by EU law or national regulations to report the percentage gap.

The assessment is legally required, no identified requirement, or unanswered. An unanswered assessment is not treated as outside scope. Workforce size, the presence of female and male employees, and an entered percentage do not select the condition. No employee-count threshold is stored.

The percentage is the reportable fact. Its bounds are not assumed, because the sign and components follow the applicable legal methodology.

CALCULATION METADATA, not implemented: average female remuneration and average male remuneration, in the reporting currency. An applicable-law methodology is kept. The guidance average is not substituted for that methodology.

NON-MANDATORY GUIDANCE paragraphs 123–131 describe those averages. Aggregate remuneration inputs only.

## 8. Collective bargaining measurement

REGULATORY REQUIREMENT: paragraph 42(c) is the percentage of employees covered by collective bargaining agreements.

Coverage is not trade union membership, employee representation, works-council membership, or a count of agreements. An employee covered by more than one agreement is counted once.

PREPARATION DATA: the covered-employee count and a headcount denominator.

CALCULATION METADATA: coverage uses that count and that headcount. The formula is not implemented. A result is from 0 to 100 percent. A zero denominator is not a valid percentage. A missing figure is not zero. A verified zero percent is valid. Headcount is not mixed with full-time equivalents unless a methodology justifies it.

NON-MANDATORY GUIDANCE paragraphs 132–135 discuss ranges. No reporting-band concept was verified, so the legal percentage is not replaced by a band.

## 9. Annual training-hours methodology

REGULATORY REQUIREMENT: paragraph 42(d) is one average number of annual training hours per employee.

The four gender-specific averages are not carried forward.

CALCULATION METADATA: average = total relevant training hours ÷ employee headcount. The formula is not implemented. Missing training hours are not zero. A verified zero stays distinct from missing data. A zero headcount is not a valid average.

NON-MANDATORY GUIDANCE paragraphs 136–137 describe that headcount average. Appendix A describes training as initiatives to maintain or improve skills and knowledge of the undertaking's own workforce.

## 10. B8 workforce-data relationships

The coverage denominator and the training headcount may reuse a B8 headcount only when the reporting period, organisational boundary, and measurement basis are the same headcount. An FTE figure is not that denominator. These counts are not the Phase 2A employee-size measure. `B8_EMPLOYMENT_CONTRACT_COUNTRY` is referenced by the minimum-wage determination and is not copied.

## 11. Convictions and fines

REGULATORY REQUIREMENT: paragraph 43 asks for two quantities: the number of convictions, and the total amount of fines incurred.

They stay separate. The count is a non-negative integer. The amount uses the reporting currency. Euro is not hardcoded. The reporting period is the duration of the fact.

A pending proceeding, an allegation, an investigation, and a non-final decision are not convictions. A pending penalty is not an incurred fine. Cash payment is not assumed to be the recognition period. No automatic currency conversion is applied. A penalty that is not for anti-corruption or anti-bribery laws is outside the amount.

Internal discipline, whistleblower reports, and unresolved litigation are outside paragraph 43. No further mandatory governance metric is added.

NON-MANDATORY GUIDANCE paragraphs 138–141 discuss convictions, monetary penalties, and financial-statement recognition.

## 12. Event-based applicability

CONDITIONAL APPLICABILITY: the conviction count applies when relevant convictions occurred. The fine amount applies when relevant fines were incurred. Both events satisfy both conditions. One event does not require the other metric.

PREPARATION DATA also records that neither occurred after assessment, and an assessment that has not been completed. An unanswered assessment does not write zero into either metric. A completed finding that neither occurred also does not write zero. A reported zero stays distinct from missing data.

Whether the word "and" in paragraph 43 requires both event types before either metric is reported is unresolved. Each metric follows its own assessed event.

## 13. Privacy considerations

Minimum wage, pay gap, coverage, training, convictions, and fines are aggregate facts. The registry stores no individual salary record, no employee name, no identification number, and no case file. Detailed case management is outside this phase.

## 14. Employee-size treatment

Paragraphs 42 and 43 have no square-bracket relief. Every B10 and B11 definition uses `voluntaryForEmployeesLe10: false`. The registry does not read `Company.employeeCount`. Requirement type, conditional applicability, and employee-size relief stay separate.

## 15. Annex II membership

Membership is read from the Phase 2A dataset.

| Canonical reference | 10 employees or fewer | More than 10 |
| --- | --- | --- |
| Para 42, point (a) | Member | Member |
| Para 42, point (c) | Member | Member |
| Para 42, point (d) | Member | Member |

Paragraph 42(b) and paragraph 43 are not Annex II rows. The preparation inputs are not Annex II rows. Listing in Annex II does not decide that the value-chain cap applies to a request.

## 16. EFRAG taxonomy mappings

Verified:

| Concept | Fact |
| --- | --- |
| `vs:EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement` | Minimum-wage response |
| `vs:PercentageGapInPayBetweenFemaleAndMaleEmployees` | Gender pay gap |
| `vs:PercentageOfEmployeesCoveredByCollectiveBargainingAgreements` | Collective-bargaining coverage |
| `vs:AverageNumberOfAnnualTrainingHoursPerEmployee` | Training-hours average |
| `vs:TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws` | Convictions |
| `vs:TotalAmountOfFinesForTheViolationOfAnticorruptionAndAntibriberyLaws` | Fines |

Unresolved, with no QName stored: the wage determination, the pay-gap legal obligation, both average-remuneration inputs, the covered-employee count, the coverage denominator, total training hours, the training headcount, and the event assessment. Item types remain unverified.

## 17. Knowledge Hub references

Verified paragraph pages, pasted in full:

- Paragraph 42(a): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/a`
- Paragraph 42(b): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/b`
- Paragraph 42(c): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/c`
- Paragraph 42(d): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/d`
- Paragraph 43: `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/43`

The legal source remains the Regulation ELI. No 2025 recommendation URL is used. The guidance paragraph numbers above are non-mandatory and have no separate URL stored.

## 18. Calculation dependencies

| Output | Inputs | Status |
| --- | --- | --- |
| Gender pay gap | Average female and average male remuneration | Incomplete. Applicable law prevails over the guidance formula |
| Collective-bargaining percentage | Covered employees and headcount denominator | Incomplete. Zero denominator is not a valid percentage |
| Training-hours average | Total training hours and training headcount | Incomplete. Zero headcount is not a valid average |
| Conviction count | None | Boundary only. Excludes the fine amount |
| Fine amount | None | Boundary only. Excludes the conviction count |

No emission factors and no conversion factors are stored.

## 19. Remaining uncertainties

- How several countries or agreements reduce to the one minimum-wage fact is unresolved.
- The pay-gap sign and components follow applicable law. The guidance average is recorded and not implemented.
- Percentage ranges in the collective-bargaining guidance have no verified digital concept.
- Whether paragraph 43's "and" requires both event types before either number is reported is unresolved. The metrics stay independent.
- Appendix A does not define conviction. Allegations and non-final proceedings are excluded. The remaining boundary with guidance paragraphs 138–141 is not a stored formula.
- Financial-statement recognition of fines is methodology metadata. No accounting engine is implemented.
- The total-training-hours input shares the hours value shape used for the average. It is preparation data, not the reported metric.
