import type {
  ApplicabilityCondition,
  Paragraph22Reason,
  Vs2026Datapoint,
  Vs2026Disclosure,
  Vs2026RepeatingGroup,
} from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import {
  ANNEX_II_B1,
  ANNEX_II_NOT_LISTED,
  knowledgeHubUnavailable,
  verifiedParagraph,
} from "./references";

/**
 * Annex I disclosure B1, paragraphs 27 and 28.
 * Paragraph 18 is not part of this disclosure.
 */

const PARAGRAPH_22_REASONS: readonly Paragraph22Reason[] = Object.freeze([
  Object.freeze({
    id: "SERIOUSLY_PREJUDICIAL_COMMERCIAL",
    point: "22(a)",
    text: "in exceptional cases, information the disclosure of which would be seriously prejudicial to the commercial position of the undertaking",
  }),
  Object.freeze({
    id: "TRADE_SECRET",
    point: "22(b)",
    text: "information corresponding to intellectual capital, intellectual property, know-how, technological information, or the results of innovation, that qualifies as a trade secret",
  }),
  Object.freeze({
    id: "CLASSIFIED",
    point: "22(c)",
    text: "classified information",
  }),
  Object.freeze({
    id: "OTHER_LEGALLY_PROTECTED",
    point: "22(d)",
    text: "other information that is to be protected from unauthorised access or disclosure because of obligations laid down in other Union legal acts or in national law, or in order to safeguard the privacy or security of a natural person or the security of a legal person",
  }),
]);

function b1(point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B1",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    ...point,
  });
}

const MODULE_OPTION = b1({
  id: "B1_MODULE_OPTION",
  paragraph: "27(a)",
  regulatoryStatement:
    "which of the following options it has selected: OPTION A: Basic Module (only); OPTION B: Basic Module and Comprehensive Module",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.moduleOption,
  knowledgeHub: verifiedParagraph("27(a)"),
  role: "DERIVED_FROM_REPORTING_CONFIGURATION",
  valueSource: {
    kind: "REPORTING_PERIOD_CONFIGURATION",
    column: "vs2026ReportingOption",
    reader: "getReportingConfiguration",
  },
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "OPTION_A",
        legalText: "OPTION A: Basic Module (only)",
        xbrlMember: "OptionABasicModuleOnlyMember",
      },
      {
        id: "OPTION_B",
        legalText: "OPTION B: Basic Module and Comprehensive Module",
        xbrlMember: "OptionBBasicModuleAndComprehensiveModuleMember",
      },
    ],
  },
  xbrl: verifiedXbrl("vs:BasisForPreparation", {
    memberNamesFromAudit: [
      "OptionABasicModuleOnlyMember",
      "OptionBBasicModuleAndComprehensiveModuleMember",
    ],
    note: "The saved reporting-period option is the only value. This definition does not store a second option.",
  }),
  dataSourceNote:
    "Read vs2026ReportingOption for the reporting period. Do not read the legacy boolean datapoints, and do not derive the option from workforce size.",
  validationNote:
    "Future output must use the saved configuration. A B1 statement that names the other option is a contradiction.",
});

const COMPLIANCE_STATEMENT = b1({
  id: "B1_EXPLICIT_COMPLIANCE_STATEMENT",
  paragraph: "27(a)",
  regulatoryStatement:
    "make an explicit statement of compliance with this voluntary standard using the selected option",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.moduleOption,
  knowledgeHub: verifiedParagraph("27(a)"),
  role: "REGULATORY_DATAPOINT",
  value: {
    kind: "EXPLICIT_STATEMENT",
    bindsToDatapointId: "B1_MODULE_OPTION",
  },
  xbrl: verifiedXbrl("vs:ExplicitStatementOfCompliance", {
    note: "The concept is verified. Its item type was not re-read from the taxonomy in this phase. The statement does not select the option.",
  }),
});

const OMITTED_DISCLOSURES = b1({
  id: "B1_OMITTED_DISCLOSURES",
  paragraph: "27(b)",
  regulatoryStatement:
    "if the undertaking has omitted a disclosure in accordance with paragraph 22 on omission of information, the undertaking shall indicate the disclosures that it has omitted",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "WHEN_PARAGRAPH_22_OMISSION_IS_USED" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("27(b)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "REPEATING_REFERENCES", cardinality: "ZERO_OR_MORE" },
  xbrl: verifiedXbrl("vs:ListOfOmittedDisclosures", {
    note: "The fact lists omitted disclosures. Paragraph 22 reasons are legal conditions, not a second taxonomy concept.",
  }),
  omission: {
    identifiesEachOmittedDatapoint: true,
    reasons: PARAGRAPH_22_REASONS,
    reassessAtEachReportingDate: true,
    separateFromApplicabilityState: true,
    separateFromMateriality: true,
  },
  validationNote:
    "An omission is valid only when each omitted datapoint is identified, one paragraph 22 reason applies, and the omission is reassessed for this reporting period. This is not an applicability outcome.",
});

const REPORTING_BASIS = b1({
  id: "B1_REPORTING_BASIS",
  paragraph: "27(c)",
  regulatoryStatement:
    "whether the sustainability report has been prepared on an individual basis (the report is limited to the undertaking’s information only) or on a consolidated basis (the report includes information about the undertaking and its subsidiaries)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.reportingBasis,
  knowledgeHub: verifiedParagraph("27(c)"),
  role: "REGULATORY_DATAPOINT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      { id: "INDIVIDUAL", legalText: "individual basis", xbrlMember: "IndividualMember" },
      { id: "CONSOLIDATED", legalText: "consolidated basis", xbrlMember: "ConsolidatedMember" },
    ],
  },
  xbrl: verifiedXbrl("vs:BasisForReporting", {
    memberNamesFromAudit: ["IndividualMember", "ConsolidatedMember"],
  }),
  dataSourceNote:
    "This is the reporting basis of the sustainability report for the period. It is not a company-master flag.",
});

const SUBSIDIARY_NAME = b1({
  id: "B1_SUBSIDIARY_NAME",
  paragraph: "27(d)",
  regulatoryStatement: "the list of the subsidiaries covered in the report",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "WHEN_REPORTING_BASIS_IS_CONSOLIDATED" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("27(d)"),
  role: "REGULATORY_DATAPOINT",
  repeatingGroupId: "B1_SUBSIDIARY",
  value: { kind: "TEXT" },
  xbrl: verifiedXbrl("vs:NameOfTheSubsidiary", {
    dimensions: ["typed subsidiary identifier"],
    note: "Repeating row. No fixed maximum is defined.",
  }),
});

const SUBSIDIARY_ADDRESS = b1({
  id: "B1_SUBSIDIARY_REGISTERED_ADDRESS",
  paragraph: "27(d)",
  regulatoryStatement:
    "including their registered address, the official address of the undertaking",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "WHEN_REPORTING_BASIS_IS_CONSOLIDATED" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("27(d)"),
  role: "REGULATORY_DATAPOINT",
  repeatingGroupId: "B1_SUBSIDIARY",
  value: { kind: "TEXT" },
  xbrl: verifiedXbrl("vs:RegisteredAddressOfTheSubsidiary"),
});

const SUBSIDIARIES: Vs2026RepeatingGroup = Object.freeze({
  id: "B1_SUBSIDIARY",
  disclosure: "B1",
  paragraph: "27(d)",
  regulatoryStatement:
    "in case of a consolidated sustainability report, the list of the subsidiaries, including their registered address, covered in the report",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: {
    kind: "WHEN_REPORTING_BASIS_IS_CONSOLIDATED",
  } satisfies ApplicabilityCondition,
  components: Object.freeze([SUBSIDIARY_NAME, SUBSIDIARY_ADDRESS]),
});

const LEGAL_FORM = b1({
  id: "B1_LEGAL_FORM",
  paragraph: "27(e)(i)",
  regulatoryStatement: "the undertaking’s legal form",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(i)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "ENUMERATION", members: [], fullMemberList: "NOT_REPRODUCED" },
  xbrl: verifiedXbrl("vs:UndertakingsLegalForm", {
    memberNamesFromAudit: ["OtherUndertakingsLegalForm"],
    note: "The full legal-form enumeration was not reproduced. OtherUndertakingsLegalForm is the overflow member named in the verified audit.",
  }),
  dataSourceNote:
    "Company has no legal-form column. Do not copy another company attribute into this fact until a later mapping says they are the same fact.",
});

const NACE = b1({
  id: "B1_NACE_CODES",
  paragraph: "27(e)(ii)",
  regulatoryStatement: "NACE sector classification code(s)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: knowledgeHubUnavailable(
    "No verified Knowledge Hub URL for paragraph 27(e)(ii). The NACE legal-text address checked in Phase 1B was not publishable.",
  ),
  role: "REGULATORY_DATAPOINT",
  value: {
    kind: "ENUMERATION_SET",
    classification: "NACE_CODES",
    fullMemberList: "NOT_REPRODUCED",
  },
  xbrl: verifiedXbrl("vs:NaceSectorClassificationCodes", {
    note: "The NACE member list was not reproduced. The concept QName is verified.",
  }),
  dataSourceNote:
    "Company.industry is not a NACE code list. This fact stays on the reporting period.",
});

const BALANCE_SHEET = b1({
  id: "B1_BALANCE_SHEET_TOTAL",
  paragraph: "27(e)(iii)",
  regulatoryStatement: "size of the balance sheet (total assets in monetary units)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(iii)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
  xbrl: verifiedXbrl("vs:Assets", {
    note: "Monetary amount in the undertaking’s reporting currency. The taxonomy name is Assets.",
  }),
  dataSourceNote:
    "Period amount. The reporting currency is the company currency metadata, not a hard-coded euro unit.",
});

const TURNOVER = b1({
  id: "B1_TURNOVER",
  paragraph: "27(e)(iv)",
  regulatoryStatement: "turnover (in monetary units)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(iv)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
  xbrl: verifiedXbrl("vs:Turnover"),
  dataSourceNote: "Period amount in the reporting currency.",
});

const EMPLOYEES = b1({
  id: "B1_EMPLOYEES",
  paragraph: "27(e)(v)",
  regulatoryStatement: "number of employees in headcount or full-time equivalents",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(v)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "NUMBER", methodology: "ONE_OF_HEADCOUNT_OR_FTE" },
  xbrl: verifiedXbrl("vs:NumberOfEmployees", {
    dimensions: ["vs:EmployeeCountingMethodology"],
    memberNamesFromAudit: ["HeadcountMember", "Full-TimeEquivalentFTEMember"],
    note: "One number, using the methodology selected for this period. This fact is not the employee-size classification measure.",
  }),
  validationNote: "Headcount and full-time equivalents are alternatives for one fact.",
  dataSourceNote:
    "Do not read a stored company workforce figure as this disclosure. A later phase must choose an explicit measure before employee-size classification.",
});

const EMPLOYEE_METHODOLOGY = b1({
  id: "B1_EMPLOYEE_COUNTING_METHODOLOGY",
  paragraph: "27(e)(v)",
  regulatoryStatement: "headcount or full-time equivalents",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(v)"),
  role: "REGULATORY_DATAPOINT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      { id: "HEADCOUNT", legalText: "headcount", xbrlMember: "HeadcountMember" },
      {
        id: "FULL_TIME_EQUIVALENT",
        legalText: "full-time equivalents",
        xbrlMember: "Full-TimeEquivalentFTEMember",
      },
    ],
  },
  xbrl: verifiedXbrl("vs:EmployeeCountingMethodology", {
    memberNamesFromAudit: ["HeadcountMember", "Full-TimeEquivalentFTEMember"],
  }),
});

const COUNTRY = b1({
  id: "B1_COUNTRY_PRIMARY_OPERATIONS",
  paragraph: "27(e)(vi)",
  regulatoryStatement:
    "country of primary operations and location of significant asset(s)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_B1.undertakingInformation,
  knowledgeHub: verifiedParagraph("27(e)(vi)"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "TEXT" },
  xbrl: verifiedXbrl("vs:CountryOfPrimaryOperationsAndLocationOfSignificantAssets", {
    note: "One verified concept name covers both the country and the location of significant assets. Splitting them is unresolved.",
  }),
  dataSourceNote:
    "Company.country is the registered country metadata. It is not automatically the country of primary operations.",
});

function siteComponent(
  id: string,
  regulatoryStatement: string,
  value: Vs2026Datapoint["value"],
  xbrl: Vs2026Datapoint["xbrl"],
): Vs2026Datapoint {
  return b1({
    id,
    paragraph: "27(e)(vii)",
    regulatoryStatement,
    requirementType: "ESSENTIAL",
    applicability: { kind: "ALWAYS" },
    annexII: ANNEX_II_B1.undertakingInformation,
    knowledgeHub: verifiedParagraph("27(e)(vii)"),
    role: "REGULATORY_DATAPOINT",
    repeatingGroupId: "B1_SITE",
    value,
    xbrl,
  });
}

const SITE_IDENTIFIER = siteComponent(
  "B1_SITE_IDENTIFIER",
  "identity of a site owned, leased or managed",
  { kind: "TEXT" },
  unverifiedXbrl(
    "IdentifierOfSiteTypedAxis is the repeating axis named in the verified audit. It was not verified as an item concept QName.",
  ),
);

const SITE_ADDRESS = siteComponent(
  "B1_SITE_ADDRESS",
  "address of the site",
  { kind: "TEXT" },
  verifiedXbrl("vs:AddressOfSite"),
);

const SITE_POSTAL_CODE = siteComponent(
  "B1_SITE_POSTAL_CODE",
  "postal code of the site",
  { kind: "TEXT" },
  verifiedXbrl("vs:PostalCodeOfSite"),
);

const SITE_CITY = siteComponent(
  "B1_SITE_CITY",
  "city of the site",
  { kind: "TEXT" },
  verifiedXbrl("vs:CityOfSite"),
);

const SITE_COUNTRY = siteComponent(
  "B1_SITE_COUNTRY",
  "country of the site",
  { kind: "ENUMERATION", members: [], fullMemberList: "NOT_REPRODUCED" },
  verifiedXbrl("vs:CountryOfSite", {
    note: "Country member list was not reproduced.",
  }),
);

const SITE_GPS = siteComponent(
  "B1_SITE_GPS_LOCATION",
  "geolocation of sites owned, leased or managed",
  { kind: "GPS_LOCATION" },
  verifiedXbrl("vs:GPSLocationOfSite", {
    note: "Latitude and longitude are one geolocation fact on the site row, not two always-required numbers.",
  }),
);

const SITES: Vs2026RepeatingGroup = Object.freeze({
  id: "B1_SITE",
  disclosure: "B1",
  paragraph: "27(e)(vii)",
  regulatoryStatement: "geolocation of sites owned, leased or managed",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: { kind: "ALWAYS" } satisfies ApplicabilityCondition,
  components: Object.freeze([
    SITE_IDENTIFIER,
    SITE_ADDRESS,
    SITE_POSTAL_CODE,
    SITE_CITY,
    SITE_COUNTRY,
    SITE_GPS,
  ]),
});

const CERTIFICATIONS = b1({
  id: "B1_SUSTAINABILITY_CERTIFICATIONS",
  paragraph: "28",
  regulatoryStatement:
    "If the undertaking has obtained any sustainability-related certification or label, it shall provide a brief description of those (including, where relevant, the issuers of the certification or label, date and rating score).",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "WHEN_CERTIFICATION_OR_LABEL_OBTAINED" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("28"),
  role: "REGULATORY_DATAPOINT",
  value: { kind: "NARRATIVE" },
  xbrl: verifiedXbrl("vs:DescriptionOfSustainabilityRelatedCertificationsOrLabels"),
});

const SCALARS: readonly Vs2026Datapoint[] = Object.freeze([
  MODULE_OPTION,
  COMPLIANCE_STATEMENT,
  OMITTED_DISCLOSURES,
  REPORTING_BASIS,
  LEGAL_FORM,
  NACE,
  BALANCE_SHEET,
  TURNOVER,
  EMPLOYEES,
  EMPLOYEE_METHODOLOGY,
  COUNTRY,
  CERTIFICATIONS,
]);

export const B1_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B1",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Basis for preparation",
  paragraphs: Object.freeze(["27", "28"]),
  datapoints: SCALARS,
  repeatingGroups: Object.freeze([SUBSIDIARIES, SITES]),
  guidanceDatapoints: Object.freeze([]),
});
