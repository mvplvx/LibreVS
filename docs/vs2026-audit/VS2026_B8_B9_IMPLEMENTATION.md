# VS 2026 B8 and B9 registry

Phase 2D.5. Definitions are in `lib/vsme/vs2026/registry/b8.ts` and `lib/vsme/vs2026/registry/b9.ts`. The running workforce sections were not changed.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560, paragraphs 40 and 41, with Appendix A for employee, recordable work-related accident, and recordable work-related ill health. Digital names come from the Phase 1B mapping of VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16. A recorded concept name is not upgraded when that mapping row is `UNVERIFIED`.

## 1. Regulatory requirements

REGULATORY REQUIREMENT, paragraph 40. The undertaking discloses the number of employees in headcount or full-time equivalent for:

- (a) type of employment contract (temporary or permanent);
- (b) gender;
- (c) country of the employment contract, if the undertaking operates in more than one country.

These are three requirements. Employee turnover is Annex I C5 paragraph 58. It is not a B8 requirement.

REGULATORY REQUIREMENT, paragraph 41. The undertaking discloses, for its employees:

- (a) the number and rate of recordable work-related accidents;
- (b) subject to legal restrictions, the sum of the fatalities from recordable work-related accidents and recordable work-related ill health.

Appendix A: an employee is an individual in an employment relationship with the undertaking according to national law or practice. A work-related accident is recordable if it results in death or more than three days of absence from work. A case of work-related ill health is recordable if it results in death or absence from work.

## 2. Existing VSME B8/B9 fields examined

`lib/vsme/sections/b8-b11.ts` was read and not edited.

B8 has 17 fields: permanent and temporary counts, four gender counts, five country slots with a code and a count, and an employee turnover rate. The section cites recommendation paragraphs 39 and 40. The taxonomy local name for permanent employees is spelled Contact.

B9 has 4 fields: recordable accidents, the accident rate, fatalities from injuries, and fatalities from ill health, as two separate counts. The section cites recommendation paragraph 41.

## 3. Old-to-new mapping

| Previous field | New definition |
| --- | --- |
| Permanent employees | `B8_EMPLOYEES_PERMANENT` |
| Temporary contract employees | `B8_EMPLOYEES_TEMPORARY` |
| Male, female, other, and gender not reported | The four gender counts |
| Five country code and count slots | Open group `B8_EMPLOYMENT_CONTRACT_COUNTRY` |
| Employee turnover rate | Not carried forward. It is C5 paragraph 58 |
| Recordable accidents | `B9_RECORDABLE_ACCIDENTS` |
| Accident rate | `B9_RECORDABLE_ACCIDENT_RATE` |
| Two fatality counts | One combined total, with the two counts kept as preparation inputs |

## 4. New VS 2026 definitions

Annex I completion facts, class REGULATORY REQUIREMENT:

| Id | Paragraph |
| --- | --- |
| `B8_EMPLOYEES_PERMANENT` | 40(a) |
| `B8_EMPLOYEES_TEMPORARY` | 40(a) |
| `B8_EMPLOYEES_MALE` | 40(b) |
| `B8_EMPLOYEES_FEMALE` | 40(b) |
| `B8_EMPLOYEES_OTHER_GENDER` | 40(b) |
| `B8_EMPLOYEES_GENDER_NOT_REPORTED` | 40(b) |
| `B8_EMPLOYEES_BY_COUNTRY` | 40(c) |
| `B9_RECORDABLE_ACCIDENTS` | 41(a) |
| `B9_RECORDABLE_ACCIDENT_RATE` | 41(a) |
| `B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM` | 41(b) |

PREPARATION DATA: the measurement basis, the multi-country assessment, the employment-contract country code, hours worked, the hours origin, the accident-rate basis, the fatality legal restriction, and the two fatality components.

Ten B8 definitions and nine B9 definitions are not nineteen XBRL concepts. No employee-level record is stored.

## 5. Employment-contract classifications

REGULATORY REQUIREMENT: paragraph 40(a) is temporary or permanent. Those are the only mandatory categories. An identifier outside them is invalid.

Appendix A leaves the employment relationship to national law or practice. That dependence is methodology metadata. It does not add a third contract category.

A reported zero stays distinct from a missing count.

## 6. Gender classifications

REGULATORY REQUIREMENT: paragraph 40(b) requires the number of employees by gender. Annex I does not list the category labels.

EFRAG DIGITAL REQUIREMENT: the verified concepts are male, female, other, and not reported. Each is an aggregate count. No member QName was verified in addition to those concepts. Gender not reported is a category. An empty field is missing data, not that category.

National law may not use the same categories. The four concepts remain the digital representation of the gender breakdown.

## 7. Country-level reporting

REGULATORY REQUIREMENT: paragraph 40(c) applies when the undertaking operates in more than one country.

PREPARATION DATA: the assessment is operates in more than one country, does not, or unanswered. An unanswered assessment is unassessed. The number of B1 sites does not select it. The registered country is not treated as every employment-contract country.

The country list is open. Each row has a country identity and a workforce count on the selected basis. `CountryOfEmploymentContractAxis` is the axis named in the audit. Country member codes are not reproduced. There is no five-country maximum.

## 8. Headcount versus FTE

PREPARATION DATA: `B8_MEASUREMENT_BASIS` reuses the member identifiers `HEADCOUNT` and `FULL_TIME_EQUIVALENT` from `B1_EMPLOYEE_COUNTING_METHODOLOGY`. It does not copy the B1 concept onto a B8 QName.

CALCULATION METADATA: headcount and full-time equivalents are not added. Headcount is not converted into full-time equivalents. One full-time equivalent is not assumed to equal one employee. Headcount is a non-negative integer. Full-time equivalents may use a decimal. The reporting period is the duration of the fact. A period-end snapshot is not hardcoded. The Phase 1B source set does not pin a rule that chooses period-end over an average.

The basis is not the Phase 2A measure `VS2026_EMPLOYEE_PROPORTIONALITY`.

## 9. B1 workforce data relationships

`B1_EMPLOYEES` is paragraph 27(e)(v): one number for the undertaking. Paragraph 40 is the contract, gender, and country breakdown.

The breakdowns share the B1 member identifiers. They are not required to equal `B1_EMPLOYEES` when the basis, period, organisational boundary, or methodology differs. The registry does not read a stored company workforce figure.

## 10. Accident counts and rates

REGULATORY REQUIREMENT: paragraph 41(a) contains two facts. `B9_RECORDABLE_ACCIDENTS` is the number. `B9_RECORDABLE_ACCIDENT_RATE` is the rate.

The count is a non-negative integer. A reported zero is valid. A missing count is not a finding that no accidents occurred. The number of accidents is not the number of injured employees.

Appendix A supplies the recordable-accident definition. No alternative definition is stored.

## 11. Accident-rate methodology

CALCULATION METADATA, not implemented:

```text
Accident rate = number of recordable work-related accidents ÷ hours worked × selected calculation basis
```

PREPARATION DATA: hours worked, whether those hours were measured or estimated, and the selected basis.

NON-MANDATORY GUIDANCE: the bases recorded from EFRAG guidance are 200 000 hours worked and 1 000 000 hours worked. Neither basis is mandatory. Paragraph 41 does not specify the denominator. No member QName was verified for either basis. An unanswered basis is unassessed.

Future checks: the basis must be known; hours must be positive; missing hours are not zero; zero hours are not a valid rate; estimated hours stay distinct from measured hours; the rate uses the same period and workforce boundary as its inputs.

## 12. Fatality reporting

REGULATORY REQUIREMENT: paragraph 41(b) is one combined total. `B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM` is that total.

PREPARATION DATA: fatalities from accidents and fatalities from ill health. They are not additional mandatory totals. They are not added without a double-counting check. A fatality that is also a recordable accident does not remove the paragraph 41(b) disclosure. A missing fatality figure is not zero.

## 13. Legal restrictions

PREPARATION DATA: `B9_FATALITY_LEGAL_RESTRICTION` records that no restriction has been identified, or that a restriction affects disclosure. An unassessed restriction is neither of those. A restriction is not missing information and is not a reported zero.

The combined total applies when disclosure is not legally restricted. This restriction is not paragraph 22. No restricted-disclosure workflow is implemented in this phase. The relationship between paragraph 41(b) and paragraph 22 remains unresolved.

## 14. Employee-size treatment

Paragraphs 40 and 41 have no square-bracket relief. Every B8 and B9 definition uses `voluntaryForEmployeesLe10: false`. The same disclosure rules apply at 8, 10, 11, 500, and 1 000 employees. The registry does not read `Company.employeeCount`. Applicability and the fatality restriction stay separate from employee-size relief.

## 15. Annex II membership

Membership is read from the Phase 2A dataset.

| Canonical reference | 10 employees or fewer | More than 10 |
| --- | --- | --- |
| Para 40, point (a) | Member | Member |
| Para 40, point (b) | Member | Member |
| Para 41, point (a) | Member | Member |

Paragraph 41(a) covers both the number and the rate. Paragraph 40(c) and paragraph 41(b) are not Annex II rows. The measurement basis, hours, rate basis, and fatality components are not Annex II rows. Listing in Annex II does not decide that the value-chain cap applies to a request.

## 16. EFRAG mapping

Verified:

| Concept | Fact |
| --- | --- |
| `vs:NumberOfPermanentContractEmployees` | Permanent contracts |
| `vs:NumberOfTemporaryContractEmployees` | Temporary contracts |
| `vs:NumberOfMaleEmployees` | Male |
| `vs:NumberOfFemaleEmployees` | Female |
| `vs:NumberOfOtherGenderEmployees` | Other |
| `vs:NumberOfNonReportedGenderEmployees` | Gender not reported |
| `vs:NumberOfEmployeesForCountryOfEmploymentContract` | Employees by country of employment contract |
| `vs:NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod` | Accident count |
| `vs:RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod` | Accident rate |
| `vs:SumOfFatalitiesAsAResultOfRecordableWorkRelatedAccidentsAndRecordableWorkRelatedIllHealth` | Combined fatalities |

Unresolved, with no QName stored: the measurement basis, the multi-country assessment, the country code, hours worked, the hours origin, the rate basis, the legal restriction, and the two fatality components. Item types remain unverified. Country member codes are not reproduced.

## 17. Knowledge Hub references

Verified subpoint pages, pasted in full:

- Paragraph 40(a): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/a`
- Paragraph 40(b): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/b`
- Paragraph 40(c): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/c`
- Paragraph 41(a): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/41/a`
- Paragraph 41(b): `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/41/b`

Paragraphs 40 and 41 have no separate publishable URL in the Phase 1B mapping. The measurement-basis fact keeps the Regulation ELI. The country-code rows in the hub file had no deep link of their own; they use the verified paragraph 40(c) page. No 2025 recommendation URL is used.

## 18. Remaining uncertainties

- Whether paragraph 40 numbers are a period-end figure or an average is not pinned. Neither is hardcoded.
- The paragraph 40 basis and the paragraph 27(e)(v) basis may differ. No equality rule is implemented.
- Country member codes from the XBRL country taxonomy are not reproduced.
- Gender category labels come from verified concepts. Annex I itself only says "gender".
- The two accident-rate bases are guidance. No taxonomy member was verified, and paragraph 41 does not choose one.
- No hours-worked concept was verified.
- How paragraph 41(b) legal restrictions relate to paragraph 22 omissions is unresolved.
- The two fatality components are not summed. Overlap with the accident count is a future check.
- No personal workforce records are modelled.
