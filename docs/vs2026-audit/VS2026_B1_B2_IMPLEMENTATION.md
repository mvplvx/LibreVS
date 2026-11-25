# VS 2026 B1 and B2 registry

Phase 2D.1. The definitions live in `lib/vsme/vs2026/registry/` and are not imported by the running VSME registry, scope, workspace, or export code.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560. Digital mappings are EFRAG VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16, package `2.0.0+2026-11-03.gha-31`. A verified concept QName is not a verified XBRL item type. The audit `data_type` column is not copied as the item type.

## 1. Implemented regulatory datapoints

Annex I completion set: 27 datapoints. Two repeating groups describe structure and are not extra facts. Three cooperative items are EFRAG guidance, outside that set.

| Disclosure | Annex I | Datapoints |
| --- | --- | --- |
| B1 Basis for preparation | Paragraphs 27 and 28 | 20, including 2 subsidiary components and 6 site components |
| B2 Practices, policies and future initiatives | Paragraphs 29, 30 and 31 | 7 |

Paragraph 31 is a relation to disclosure C2 when the reporting option is Option B. It is not a B2 fact. Whether a paragraph 25 selection of C2 also triggers that sentence is unresolved.

## 2. Regulatory references

B1 paragraph 27(a) is the selected option and the explicit compliance statement. Paragraph 27(b) lists disclosures omitted under paragraph 22. Paragraph 27(c) is individual or consolidated. Paragraph 27(d) is the subsidiary list when the report is consolidated. Paragraph 27(e)(i) to (vii) is legal form, NACE codes, balance-sheet total, turnover, employee number and methodology, country of primary operations and location of significant assets, and site geolocation. Paragraph 28 is a certification or label the undertaking has obtained.

B2 paragraph 29 applies when the undertaking has practices, policies or future initiatives. It then asks separately about practices, policies and whether those policies are public, separate environmental, social or governance policies, future initiatives, and targets for the policies. Paragraph 30 points to Appendix B. Appendix B topics are Climate Change, Pollution, Water, Biodiversity and Ecosystems, Circular Economy and Resource Use, Own Workforce and Workers in the Value Chain, Affected Communities, Consumers and End-users, and Business Conduct. Sub-topics are not modelled as datapoints.

None of these datapoints uses the square-bracket employee-size relief. `voluntaryForEmployeesLe10` is false. Annex II membership is resolved through `annexIIFor` against `annexII.ts`.

## 3. Old-to-new field mapping

The running sections were inspected and left unchanged. B1 has 61 fixed fields. B2 has 33. The decisions below are the Phase 1B matrix, applied as definitions rather than as a second copy of those fields.

| Legacy shape | Registry id |
| --- | --- |
| Two module-option booleans | `B1_MODULE_OPTION`, derived from the reporting-period configuration |
| Sensitive-omission boolean and free-text list | `B1_OMITTED_DISCLOSURES` |
| Individual and consolidated booleans | `B1_REPORTING_BASIS` |
| Five subsidiary name and address slots | Group `B1_SUBSIDIARY` |
| Legal form, NACE, balance sheet, turnover, country | Same facts, ids `B1_LEGAL_FORM`, `B1_NACE_CODES`, `B1_BALANCE_SHEET_TOTAL`, `B1_TURNOVER`, `B1_COUNTRY_PRIMARY_OPERATIONS` |
| Headcount and FTE as two required numbers, plus two methodology booleans | `B1_EMPLOYEES` and `B1_EMPLOYEE_COUNTING_METHODOLOGY` |
| Five sites with separate latitude and longitude | Group `B1_SITE`, one `B1_SITE_GPS_LOCATION` |
| Certification narrative | `B1_SUSTAINABILITY_CERTIFICATIONS` |
| Ten sustainability-issue booleans, ten public flags, ten target flags | `B2_SUSTAINABILITY_ISSUES_ADDRESSED`, `B2_PRACTICE_POLICY_OR_INITIATIVE_IS_PUBLIC`, `B2_POLICY_HAS_TARGET`, plus the paragraph 29 distinctions below |
| Three cooperative fields | Same ids, role `PREPARATION_GUIDANCE` |

## 4. Removed or replaced legacy fields

The new registry does not define the 61 B1 slots or the 30 per-issue B2 booleans. In particular it does not keep five subsidiary slots, five site slots, two option booleans, two basis booleans, two employee numbers that are both always required, or separate latitude and longitude facts.

## 5. New definitions

`B1_EXPLICIT_COMPLIANCE_STATEMENT` is the paragraph 27(a) statement. It binds to `B1_MODULE_OPTION` and does not select the option.

Component ids added so each verified concept is one component: `B1_SUBSIDIARY_NAME`, `B1_SUBSIDIARY_REGISTERED_ADDRESS`, `B1_SITE_ADDRESS`, `B1_SITE_POSTAL_CODE`, `B1_SITE_CITY`, `B1_SITE_COUNTRY`.

Paragraph 29 distinctions that the single issue concept does not express: `B2_HAS_PRACTICES`, `B2_HAS_POLICIES`, `B2_SEPARATE_ESG_POLICIES`, `B2_HAS_FUTURE_INITIATIVES`. Their concept QNames are unverified.

## 6. Conditional requirements

| Condition | What it governs |
| --- | --- |
| Always | Option, compliance statement, reporting basis, paragraph 27(e) |
| Paragraph 22 omission is used | Omitted-disclosure list. Each entry needs a datapoint identity, one of points 22(a) to 22(d), and reassessment for that reporting period |
| Reporting basis is consolidated | Subsidiary rows. Cardinality is zero or more, with no maximum |
| Certification or label obtained | Paragraph 28 narrative |
| Practices, policies or initiatives exist | B2 paragraph 29. If they do not, B2 is not applicable |
| Policies exist | Public availability, separate environmental, social or governance policies, and policy targets |

Sites are zero or more. There is no maximum of five. No evaluator is implemented.

## 7. Reporting-configuration dependencies

`B1_MODULE_OPTION` reads `vs2026ReportingOption` through `getReportingConfiguration`. The legacy booleans are not a source. Employee count is not a source. The compliance statement must use that same option when output is generated. That wiring is not built.

`B1_EMPLOYEES` is the disclosure number. It is not the employee-size measure and not `Company.employeeCount`. Balance sheet and turnover use the reporting currency. `Company.country` and `Company.industry` are not copied into paragraph 27(e).

## 8. XBRL mapping coverage

25 datapoints have a verified concept QName and period type `duration`. Item types remain unverified. Five datapoints have no verified concept: `B1_SITE_IDENTIFIER` (the audit names the typed axis, not an item concept), `B2_HAS_PRACTICES`, `B2_HAS_POLICIES`, `B2_SEPARATE_ESG_POLICIES`, and `B2_HAS_FUTURE_INITIATIVES`.

Enumeration member names taken from the verified audit notes, not from a new taxonomy extract: the two BasisForPreparation members, IndividualMember, ConsolidatedMember, HeadcountMember, Full-TimeEquivalentFTEMember, and OtherUndertakingsLegalForm. Full legal-form, NACE, country, and Appendix B member QNames are not reproduced.

`B1_COUNTRY_PRIMARY_OPERATIONS` uses `vs:CountryOfPrimaryOperationsAndLocationOfSignificantAssets` for both the country and the location of significant assets. Splitting that concept is unresolved. GPS is one fact, `vs:GPSLocationOfSite`.

## 9. Knowledge Hub mapping coverage

29 datapoints use a paragraph URL that Phase 1B marked publishable. Those URLs are shared paragraph pages. `B1_NACE_CODES` has no Knowledge Hub URL. Its legal source is `http://data.europa.eu/eli/reg_del/2026/1560/oj`. The 2025 recommendation URL is not used.

## 10. Remaining implementation questions

- Paragraph 18, including `vs:ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged`, is a general timing rule. The matrix had filed it under B1. It is not in this registry. Paragraph 14 comparative information is also deferred.
- The XBRL item type for `vs:ExplicitStatementOfCompliance` and `vs:GPSLocationOfSite` was not re-read from the taxonomy.
- One public-availability boolean cannot say that some policies are public and others are not.
- Paragraph 31 is tied to Option B. Its effect on a paragraph 25 selection of C2 is unresolved.
- Repeating subsidiaries and sites are described here and are not persisted. The current unique `(reportingPeriodId, fieldId)` constraint cannot store an open list.
- Legal-form members other than the named overflow member, and the NACE code list, were not loaded from the supporting package.

The cooperative guidance items stay available and are excluded from the Annex I completion set. They are not Annex I paragraph 15.
