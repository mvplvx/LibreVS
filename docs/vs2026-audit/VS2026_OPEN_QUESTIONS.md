# VS 2026 open questions

Phase 1B status. BLOCKER means the next regulatory-core commit must wait. A pilot release can still be blocked by behaviour that this commit is not allowed to change.

## Q1. Annex II employee columns — closed

- Evidence: On 25 November 2026 the EUR-Lex HTML of CELEX 32026R1560 was read. Annex II has 23 disclosure rows. The eight Comprehensive rows are empty for undertakings with 10 employees or fewer and marked for undertakings with more than 10 employees: C1 46(a), C1 46(b), C1 46(c), C5 58, C6 61(a), C6 61(c), C7 62(a)(i) to (v), and C7 62(c), first sentence.
- The PDF file at the Official Journal URL still returns an empty WAF body, so the PDF has no checksum. The HTML table is the verification.
- Implementation blocked: no.

## Q2. Market-based Scope 2 — closed as voluntary digital information

- Affected datapoint: `B3_GHG_SCOPE1_2_GROSS_SCOPE2_MARKET_BASED_TCO2E`
- Legal reference: Annex I paragraph 33 requires estimated absolute gross emissions as Scope 1 and location-based Scope 2.
- EFRAG: template 2.0.0 has `GrossMarketBasedScope2GreenhouseGasEmissions`, plus market-based totals. Taxonomy concept `vs:GrossMarketBasedScope2GreenhouseGasEmissions`, referenced to paragraph 33. Explanatory note section 88 does not remove it.
- Treatment: B. Verified voluntary information. Not part of the paragraph 33 shall and not an Annex II row. Keep it. Do not mark it essential.
- XBRL: mapped. Confidence: high. Implementation blocked: no.

## Q3. Self-generated electricity — interpretation remains, deletion does not

- Affected datapoint: `B3_ELECTRICITY_ELECTRICITY_SELF_GENERATED_MWH`
- Legal reference: Annex I paragraph 32. The table names electricity as reflected in utility billings, and fuels. The total energy consumption is the Annex II row for undertakings with more than 10 employees.
- EFRAG: template 2.0.0 has renewable, non-renewable and total named ranges for `EnergyConsumptionFromSelfGeneratedElectricity`. The taxonomy references paragraph 32.
- Treatment: F. The legal table and the official template do not name the same rows. Keep the template row as part of the paragraph 32 breakdown. It is not an Annex II datapoint and it is not a reason to delete the field.
- XBRL: mapped. Confidence: medium on whether the legal table excludes the row; high that the template contains it. Implementation blocked: no.

## Q4. Scope 3 categories — requirement kept, fixed fields are not the taxonomy model

- Affected datapoints: the eleven LibreVS category fields. Categories 8, 10, 13 and 14 are absent from LibreVS.
- Legal reference: Annex I paragraphs 49 to 52. When Scope 3 is disclosed, the undertaking includes the significant categories.
- EFRAG: `vs:GrossScope3GreenhouseGasEmissions` is the total. In `vs-definition.xml`, `ReportingScopesAxis` has only `CurrentlyStatedMember`, `BaselineYearMember` and `TargetYearMember`. There is no GHG Protocol category member.
- Treatment: D for the category information. The total is mapped. The per-category numbers are a verified requirement without a per-category concept. Replace the eleven fixed fields with the total plus a repeating or narrative list of significant categories. Do not delete the legal information because the concept list has no category slots.
- Confidence: high. Implementation blocked: yes before those eleven fields are removed. No for the regulatory-core commit, which does not remove them.

## Q5. GHG target components — closed, do not drop them

- Affected datapoints: target-year value, base-year value, units, and scope share under C3.
- Legal reference: Annex I paragraph 53(a) to (d), when the undertaking has set targets.
- EFRAG: `GreenhouseGasEmissionReductionTargetYear` and `GreenhouseGasEmissionReductionTargetBaseYear` are `gYear` concepts. The values are the greenhouse-gas concepts dimensioned by `TargetYearMember` and `BaselineYearMember` on the estimated-absolute-emissions table. The template title uses tCO2eq. Paragraph 53(d) is represented by which of Scope 1, location-based Scope 2, and Scope 3 have target values. Explanatory note paragraph 78: the percentage-reduction column is calculated from those values and has no taxonomy item.
- Treatment: A for the year values and the scope share. D for a separate units concept, because paragraph 53(c) still requires the unit and the template fixes tCO2eq instead of a concept. None of these are obsolete.
- XBRL: values and share are dimensional; units are a fixed label. Confidence: high. Implementation blocked: no.

## Q6. Source files — partly closed

- Template 2.0.0 SHA-256 `6de5209bb247317b5632332396f2787e4ad533b7ff15c5e6ae958eaa4b9dcdab`, pinned to the versioned file, not `latest`.
- Explanatory note SHA-256 `f02da8dff73cda8bfe43010b8ad10e92809f6debb6cde83e2e05a2513ab01e6f`.
- Official Journal PDF checksum: still blocked by the WAF. Annex I remains the earlier text extraction. Annex II columns are the HTML read in Q1.
- Waste and NACE supporting packages: not downloaded.
- Implementation blocked: no for the regulatory core. Yes before claiming workbook-level or enumeration-level parity.

## Q7. B5 land-use role — closed for deletion

- `vs-all.xsd` still defines role `[1150] B5 - Environment - Biodiversity - on Land-use` at `role/role-115`.
- `vs-presentation.xml` has no presentation link for that role. No land-area concept was found. Annex I paragraph 35 asks for the sites and the name of the biodiversity-sensitive area. Explanatory note section 88 and Annex III remove the land-use metrics.
- Implementation blocked: no. The empty role title is not a hidden disclosure.

## Q8. Water-stress concept reference

- Affected datapoint: water consumed at sites in areas with water stress, paragraph 37.
- The legal sentence is consumption, not withdrawal. The taxonomy concept exists. Its reference paragraph is empty, and a pollutant concept is referenced to paragraph 37.
- Implementation blocked: no. Trust Annex I. Report the reference defect when digital mapping starts.

## Q9. Cooperative disclosures

- The three cooperative fields are EFRAG guidance paragraph 15(a) to (c). The guidance pages were opened and the descriptions match that guidance. They are not Annex I paragraph 15 and not Annex II.
- Implementation blocked: no, if they stay optional and outside completion.

## Q10. Accident rate denominator

- Paragraph 41(a) requires the number and the rate and does not state the denominator.
- Implementation blocked: auto-calculation only. Collect the reported rate.

## Q11. Three employee tests

- Reported workforce in B1 paragraph 27(e)(v) is headcount or full-time equivalent, one methodology.
- The 10-employee rule is the Annex I square-bracket and Annex II column test. The template drives it from the employee number entered in General information (explanatory note paragraph 50).
- The 1 000-employee test is the protected-undertaking average during the preceding financial year. It has no turnover limb. It does not decide Option A or Option B.
- The stored `Company.employeeCount` and the 500-employee Comprehensive gate are neither of these tests.
- Implementation blocked: the regulatory-core commit may add a separate validated category without changing runtime behaviour. A pilot release is blocked while Comprehensive is still mandatory at 500 employees.

## Q12. Knowledge Hub — verification updated

- 66 unique proposed URLs were fetched. 65 are publishable paragraph or guidance pages: the title or meta description matches the Voluntary Standard paragraph, or, for three URLs, EFRAG guidance paragraph 15.
- One proposed URL is the NACE EUR-Lex address. It returned HTTP 202 and is not publishable. Keep paragraph 27(e)(ii) and the Regulation ELI.
- 48 field rows have no deep link. They keep the Annex I citation and `http://data.europa.eu/eli/reg_del/2026/1560/oj`.
- A verified URL is a paragraph page. Several datapoints share it. HTTP 200 was not treated as correctness. All 264 existing links remain the 2025 recommendation URL and stay outdated.
- Implementation blocked: publishing an unverified URL. Not blocked for storing the legal paragraph.

## Q13. Taxonomy “draft” label — closed as a description string

- File: `META-INF/taxonomyPackage.xml` inside `VS-XBRL-Taxonomy-November-2026-v2.0.0_gha-31.zip`.
- The string is `tp:description`: “VS XBRL Taxonomy (draft).”
- Package version: `2.0.0+2026-11-03.gha-31`. Publication date in the package: 2026-11-03.
- Namespace: `https://xbrl.efrag.org/taxonomy/vs/2026-10-16/vs`. Taxonomy date: 2026-10-16. Entry point: `vs-all.xsd`.
- EFRAG’s public release, and explanatory note section 6, call this VS XBRL Taxonomy November 2026 (2.0.0).
- Explanatory note paragraphs 121 and 128 use “draft” for an April 2025 consultation package. That is a different artefact.
- Remaining uncertainty: the description was not edited when the package was published. That does not make this zip an exposure draft or unusable.
- Implementation blocked: no for mapping. XBRL generation remains outside the first pilot.

## Q14. Period type — follow the package

- `vs-all.xsd`: every declared period type is duration.
- Explanatory note paragraph 87: all concepts are now duration.
- Paragraph 79 of the same note still lists employee concepts as instant. That paragraph describes the previous design. The package and paragraph 87 prevail.
- Implementation blocked: no.
