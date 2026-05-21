import { field, section, siteSlotFields, subsidiarySlotFields, subsection } from "../schemaHelpers";

const SITE_SLOTS = 5;
const SUBSIDIARY_SLOTS = 5;

export const B1_BASIS_FOR_PREPARATION = section(
  "B1_BASIS_FOR_PREPARATION",
  "B1",
  "Basis for preparation",
  "B",
  [
    subsection("module_selection", "Module selection (paragraph 24(a))", [
      field(
        "option_basic_module_only",
        "boolean",
        "OptionBasicModuleOnly",
        "General",
        "Option A: Basic Module only",
        { efragParagraph: "24(a)(i)", description: "Undertaking reports Basic Module only" }
      ),
      field(
        "option_basic_and_comprehensive",
        "boolean",
        "OptionBasicAndComprehensiveModule",
        "General",
        "Option B: Basic and Comprehensive Module",
        { efragParagraph: "24(a)(ii)", description: "Undertaking reports Basic and Comprehensive modules" }
      ),
    ]),
    subsection("sensitive_omissions", "Classified or sensitive omissions (paragraph 24(b))", [
      field(
        "sensitive_disclosures_omitted",
        "boolean",
        "SensitiveInformationOmitted",
        "General",
        "Sensitive or classified disclosures omitted",
        { efragParagraph: "24(b)" }
      ),
      field(
        "sensitive_disclosures_omitted_list",
        "string",
        "ListOfDisclosuresOmittedAsSensitive",
        "General",
        "List of disclosures omitted as sensitive",
        { efragParagraph: "24(b)" }
      ),
    ]),
    subsection("reporting_scope", "Reporting scope (paragraph 24(c))", [
      field(
        "reporting_individual",
        "boolean",
        "IndividualMember",
        "General",
        "Individual basis reporting",
        { efragParagraph: "24(c)" }
      ),
      field(
        "reporting_consolidated",
        "boolean",
        "ConsolidatedMember",
        "General",
        "Consolidated basis reporting",
        { efragParagraph: "24(c)" }
      ),
    ]),
    subsection(
      "subsidiaries",
      "Subsidiaries in consolidated report (paragraph 24(d))",
      Array.from({ length: SUBSIDIARY_SLOTS }, (_, i) => subsidiarySlotFields(i + 1)).flat()
    ),
    subsection("undertaking_metrics", "Undertaking information (paragraph 24(e))", [
      field("legal_form", "string", "LegalForm", "General", "Legal form", {
        efragParagraph: "24(e)(i)",
      }),
      field("nace_sector_codes", "string", "NaceSectorClassificationCodes", "General", "NACE sector classification code(s)", {
        efragParagraph: "24(e)(ii)",
      }),
      field("balance_sheet_total_eur", "number", "SizeOfBalanceSheet", "General", "Balance sheet total", {
        efragParagraph: "24(e)(iii)",
        unit: "EUR",
      }),
      field("turnover_eur", "number", "Turnover", "General", "Turnover", {
        efragParagraph: "24(e)(iv)",
        unit: "EUR",
      }),
      field("employees_headcount", "number", "NumberOfEmployees", "General", "Number of employees (headcount)", {
        efragParagraph: "24(e)(v)",
        unit: "count",
      }),
      field("employees_fte", "number", "NumberOfEmployeesFTE", "General", "Number of employees (FTE)", {
        efragParagraph: "24(e)(v)",
        unit: "FTE",
      }),
      field(
        "employee_counting_headcount",
        "boolean",
        "EmployeeCountingMethodologyHeadcount",
        "General",
        "Employee counting: headcount",
        { efragParagraph: "71-72" }
      ),
      field(
        "employee_counting_fte",
        "boolean",
        "EmployeeCountingMethodologyFTE",
        "General",
        "Employee counting: FTE",
        { efragParagraph: "71-72" }
      ),
      field(
        "country_primary_operations",
        "string",
        "CountryOfPrimaryOperations",
        "General",
        "Country of primary operations",
        { efragParagraph: "24(e)(vi)" }
      ),
    ]),
    subsection(
      "sites_geolocation",
      "Sites and geolocation (paragraph 24(e)(vii), 73-75)",
      Array.from({ length: SITE_SLOTS }, (_, i) => siteSlotFields(i + 1, "General", "B1")).flat()
    ),
    subsection("certifications", "Sustainability certifications (paragraph 25)", [
      field(
        "sustainability_certifications_description",
        "string",
        "DescriptionOfSustainabilityRelatedCertificationsOrLabels",
        "General",
        "Sustainability-related certifications or labels",
        { efragParagraph: "25" }
      ),
    ]),
  ]
);
