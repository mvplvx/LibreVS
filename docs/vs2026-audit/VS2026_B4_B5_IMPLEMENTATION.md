# VS 2026 B4 and B5 registry

Phase 2D.3. Definitions are in `lib/vsme/vs2026/registry/b4.ts` and `lib/vsme/vs2026/registry/b5.ts`. The running B4 and B5 sections were not changed.

Regulatory text is Annex I of Commission Delegated Regulation (EU) 2026/1560, paragraph 34 for B4 and paragraph 35 for B5, with Appendix A for the biodiversity terms. Digital names come from the Phase 1B mapping of VS XBRL Taxonomy 2.0.0, taxonomy date 2026-10-16. A recorded concept name is not upgraded when that mapping row is `UNVERIFIED`.

## 1. Regulatory requirements

ANNEX I REQUIREMENT, B4 paragraph 34. The undertaking discloses pollutant emissions to air, water and soil from its own operations when it must report them to competent authorities under EU or national law, or when it voluntarily reports them under an Environmental Management System. If that information is already public, it may instead refer to the document, for example by a URL or hyperlink.

ANNEX I REQUIREMENT, B5 paragraph 35. If the undertaking has sites or locations in or near a biodiversity-sensitive area, it discloses those sites or locations and the name of the area.

APPENDIX A DEFINITION. Biodiversity-sensitive areas are areas protected through legal or other effective means, and areas included under the scientifically recognised designations listed in that definition. Near means a site that is (partially) overlapping or adjacent. Appendix A also permits an area-of-influence determination when the site is outside and not adjacent. That permission is supplementary and stores no distance.

## 2. Existing VSME fields examined

`lib/vsme/sections/b4-b7.ts` was read and not edited.

B4 has 34 fields: a public URL, a boolean that pollutants are not required by law, and eight fixed slots each holding a name and amounts to air, water and soil. The section cites recommendation paragraph 32 and uses kilograms.

B5 has 7 fields: a count of sites in or near a biodiversity-sensitive area, an area in hectares, a count of sites near such an area, and four land-use areas. The section cites recommendation paragraphs 33 and 34. It has no area name.

## 3. Old-to-new field mapping

| Previous fields | New definition |
| --- | --- |
| Public pollution URL | `B4_PUBLIC_DISCLOSURE_URL` |
| Not-required boolean | Removed. Replaced by `B4_REPORTING_CONDITION` |
| Eight pollutant names and three medium amounts | Open group `B4_POLLUTANT` |
| Count of sites in or near a biodiversity-sensitive area | Repeating site relationship, not a count |
| Count of sites near a biodiversity-sensitive area | Relationship member `NEAR_OVERLAPPING_OR_ADJACENT` |
| Area in hectares and four land-use metrics | Not carried forward |
| No area name in the running section | `B5_BSA_NAME` |

## 4. New canonical datapoints

Annex I completion facts, class REGULATORY REQUIREMENT:

| Id | Disclosure | Role |
| --- | --- | --- |
| `B4_PUBLIC_DISCLOSURE_URL` | B4 | Public-document reference when that method is selected |
| `B4_POLLUTANT_IDENTITY` | B4 | Pollutant on an open row |
| `B4_EMISSION_TO_AIR` | B4 | Amount to air |
| `B4_EMISSION_TO_WATER` | B4 | Amount to water |
| `B4_EMISSION_TO_SOIL` | B4 | Amount to soil |
| `B5_RELATIONSHIP_SITE_REFERENCE` | B5 | Site taken from `B1_SITE` |
| `B5_BSA_NAME` | B5 | Name of the biodiversity-sensitive area |
| `B5_BSA_RELATIONSHIP` | B5 | Located in, or near by overlap or adjacency |

INTERNAL PREPARATION DATA:

| Id | Role |
| --- | --- |
| `B4_REPORTING_CONDITION` | Legal duty, Environmental Management System reporting, both, or neither. Empty means unassessed |
| `B4_DISCLOSURE_METHOD` | Direct amounts or public-document reference |
| `B4_PUBLIC_DISCLOSURE_FLAG` | Digital boolean that the information is already public |
| `B4_POLLUTANT_REPORTING_BASIS` | Per-pollutant basis, legal duty or Environmental Management System |
| `B5_ASSESSED_SITE_REFERENCE` | B1 site that has been assessed |
| `B5_SITE_BSA_ASSESSMENT` | Relationship identified, or assessed with no relationship |
| `B5_RELATIONSHIP_BASIS` | Source or assessment basis for one relationship |

SUPPLEMENTARY INFORMATION: `B5_AREA_OF_INFLUENCE_DETERMINATION`. Appendix A permits it when a site is outside and not adjacent. It is outside the paragraph 35 shall.

Nine B4 definitions and seven B5 definitions are not fifteen XBRL concepts. Air, water and soil are three concepts. Pollutant identity is an axis, not a verified item concept.

## 5. Applicability conditions

B4 is if-applicable. The condition fact is always available so the undertaking can record the assessment. Pollutant rows apply when direct reporting is selected and a legal duty, Environmental Management System reporting, or both has been recorded. The public URL applies when the public-document method is selected. `NEITHER` does not select a method. An empty condition is unassessed. Unassessed is not `NEITHER`, and `NEITHER` is not zero emissions. Missing pollutant quantities are not zero.

B5 is if-applicable. Relationship rows apply when a site is in or near a biodiversity-sensitive area. An absent assessment record leaves the site unassessed. Unassessed is not `NO_IDENTIFIED_RELATIONSHIP`. A missing relationship row is not an assessed absence. One site may have several relationship rows. There is no fixed maximum.

## 6. Direct pollution reporting versus public-document reference

The two methods are alternatives. Selecting the public-document method does not require the pollutant quantities to be copied into LibreVS.

Three references stay separate:

- The Annex I paragraph reference on each datapoint.
- The Knowledge Hub paragraph URL, verified for paragraph 34.
- `B4_PUBLIC_DISCLOSURE_URL`, a user-provided document reference. Its value does not store the Knowledge Hub URL or the Regulation ELI.

EFRAG DIGITAL REQUIREMENT: `vs:PubliclyAvailableDisclosure` is the companion boolean. A true flag does not by itself satisfy the disclosure and does not forbid direct reporting.

A later validation engine must check that a missing URL is not a valid public reference, that an arbitrary URL does not by itself satisfy the disclosure, that the reference identifies the document where the pollutant information is already public, and that the user reference stays distinct from the paragraph, the Knowledge Hub URL, and the Regulation ELI. This phase does not fetch or validate the external document.

Mass is reported as entered. Kilograms and tonnes are EFRAG guidance examples, not mandatory units. Incompatible units are not aggregated. No emission factor is stored.

## 7. B1 and B5 site relationship

`B1_SITE` remains the site inventory. B5 site facts use `SITE_REFERENCE` to `B1_SITE_IDENTIFIER`. They do not copy address, postal code, city, country, or geolocation, and they do not create a second inventory.

```text
B1_SITE
  Site A → biodiversity-sensitive area X
  Site B → biodiversity-sensitive area Y
         → biodiversity-sensitive area Z
  Site C → no assessment record, which means unassessed
```

A site with `NO_IDENTIFIED_RELATIONSHIP` has been assessed. A site with no assessment record has not.

## 8. Employee-size treatment

Paragraphs 34 and 35 have no square-bracket relief. Every B4 and B5 datapoint uses `voluntaryForEmployeesLe10: false`. The same conditions apply at 8, 10, 11, 500 and 1 000 employees. Applicability is not inferred from an employee count. The registry does not read `Company.employeeCount`.

## 9. Annex II status

`getAnnexIIRows()` contains no B4 or B5 row. Every B4 and B5 link is `{ listed: false }`. Membership is `NOT_LISTED` for both employee categories. Being outside Annex II does not remove the disclosure from the Basic Module. The value-chain cap is a request-context decision and is not decided here.

## 10. EFRAG taxonomy mapping

Verified, package `2.0.0+2026-11-03.gha-31`, taxonomy date 2026-10-16. Item types remain unverified.

| Concept | Registry fact |
| --- | --- |
| `vs:PubliclyAvailableDisclosure` | `B4_PUBLIC_DISCLOSURE_FLAG` |
| `vs:URLOrLinkToThePubliclyAvailableDisclosure` | `B4_PUBLIC_DISCLOSURE_URL` |
| `vs:AmountOfEmissionToAir` | `B4_EMISSION_TO_AIR` |
| `vs:AmountOfEmissionToWater` | `B4_EMISSION_TO_WATER` |
| `vs:AmountOfEmissionToSoil` | `B4_EMISSION_TO_SOIL` |
| `vs:NameOfBiodiversitySensitiveArea` | `B5_BSA_NAME` |

The amount concepts are dimensioned by `TypeOfPollutantAxis`. Member QNames are not reproduced. A typed axis for other pollutants is not stored as an item concept.

Unresolved, with no QName stored:

- Reporting condition, disclosure method, pollutant identity, and pollutant reporting basis.
- Site references and the assessment state. The audit names `SiteLocatedInABiodiversitySensitiveArea` and `SiteLocatedNearABiodiversitySensitiveArea` on rows whose mapping status is `UNVERIFIED`.
- The relationship enumeration and the assessment basis.
- The area-of-influence narrative.

The count fields are not mapped to those boolean names as verified concepts. The counts are replaced by the repeating relationship.

## 11. Knowledge Hub references

Paragraph 34 uses the verified page `https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/34`. It is a shared paragraph page. The legal reference remains the Regulation ELI.

Paragraph 35 has no publishable Knowledge Hub URL in the Phase 1B mapping. Those datapoints keep the Regulation ELI and do not invent a `/da/35` link. No 2025 recommendation URL is used.

## 12. Remaining uncertainties

- Pollutant-member QNames on `TypeOfPollutantAxis` were not reproduced. Other pollutants stay on an unverified typed axis.
- The audit records an other-pollutant-to-soil concept referenced to paragraph 37. That cross-reference is not corrected here, and the B4 soil concept remains `vs:AmountOfEmissionToSoil`.
- `SiteLocatedInABiodiversitySensitiveArea` and `SiteLocatedNearABiodiversitySensitiveArea` stay unverified. Paragraph 35 uses both "in" and "near". Appendix A places partial overlap under near. The registry keeps both relationship members and does not collapse them.
- No geospatial intersection, map service, Natura 2000 integration, or distance screening is implemented. Appendix A buffer distances are not stored as a threshold.
- Paragraph 35 has no verified Knowledge Hub URL.
- Public-document content is not fetched. The future checks are metadata only.
- The empty land-use presentation role in the taxonomy is not a disclosure. The hectare metrics are not restored.
