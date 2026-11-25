import type { EmployeeSizeRule, RequirementType } from "../types";
import { VS2026_LEGAL_INSTRUMENTS } from "../types";

/**
 * Isolated VS 2026 registry types for disclosure definitions.
 * These types do not replace the running VSME field registry.
 */

export const VS2026_REGISTRY_STANDARD = VS2026_LEGAL_INSTRUMENTS.voluntaryStandard;

export const VS2026_XBRL_PACKAGE = {
  release: "2.0.0",
  packageVersion: "2.0.0+2026-11-03.gha-31",
  taxonomyDate: "2026-10-16",
  namespace: "https://xbrl.efrag.org/taxonomy/vs/2026-10-16/vs",
  periodType: "duration",
} as const;

/** No square-bracket relief. Annex II membership is stored separately. */
export const NO_EMPLOYEE_SIZE_RELIEF: EmployeeSizeRule = Object.freeze({
  voluntaryForEmployeesLe10: false,
});

export type RegistryDisclosureId =
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "B9"
  | "B10"
  | "B11";

/** Square-bracket relief. It is not an applicability state. */
export const VOLUNTARY_FOR_EMPLOYEES_LE_10: EmployeeSizeRule = Object.freeze({
  voluntaryForEmployeesLe10: true,
});

export type InformationClass =
  | "REGULATORY_FACT"
  | "PREPARATION_DATA"
  | "CALCULATED_FACT"
  | "DIGITAL_FACT"
  | "SUPPLEMENTARY";

export type CalculationBoundary = {
  readonly status: "BOUNDARY_ONLY" | "INCOMPLETE";
  readonly formula: "NOT_IMPLEMENTED";
  readonly emissionFactors: "NONE";
  readonly conversionFactors: "NONE";
  readonly missingInput: "DO_NOT_TREAT_AS_ZERO";
  readonly inputs?: readonly string[];
  readonly excludes?: readonly string[];
  readonly safeguards?: readonly string[];
  readonly methodologyReference?: string;
  readonly zeroDenominator?: "NOT_A_VALID_PERCENTAGE";
  readonly reportedZero?: "DISTINCT_FROM_MISSING";
};

export type ApplicabilityCondition =
  | { readonly kind: "ALWAYS" }
  | { readonly kind: "WHEN_PARAGRAPH_22_OMISSION_IS_USED" }
  | { readonly kind: "WHEN_REPORTING_BASIS_IS_CONSOLIDATED" }
  | { readonly kind: "WHEN_CERTIFICATION_OR_LABEL_OBTAINED" }
  | { readonly kind: "WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST" }
  | { readonly kind: "WHEN_POLICIES_EXIST" }
  | { readonly kind: "GUIDANCE_OUTSIDE_ANNEX_I" }
  | { readonly kind: "WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED" }
  | { readonly kind: "WHEN_SCOPE3_IS_DISCLOSED" }
  | { readonly kind: "WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES" }
  | { readonly kind: "WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED" }
  | { readonly kind: "WHEN_PUBLIC_DOCUMENT_REFERENCE_IS_SELECTED" }
  | { readonly kind: "WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA" }
  | { readonly kind: "WHEN_SITE_IS_OUTSIDE_AND_NOT_ADJACENT" }
  | { readonly kind: "WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST" }
  | { readonly kind: "WHEN_SITE_IS_IN_WATER_STRESS" }
  | { readonly kind: "WHEN_CIRCULAR_ECONOMY_PRINCIPLES_ARE_APPLIED" }
  | { readonly kind: "WHEN_SIGNIFICANT_MATERIAL_FLOWS" }
  | { readonly kind: "WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY" }
  | { readonly kind: "WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED" }
  | { readonly kind: "WHEN_APPLICABLE_MINIMUM_REMUNERATION_IS_IDENTIFIED" }
  | { readonly kind: "WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED" }
  | { readonly kind: "WHEN_RELEVANT_CONVICTIONS_OCCURRED" }
  | { readonly kind: "WHEN_RELEVANT_FINES_INCURRED" };

export type AnnexIILink =
  | { readonly listed: false }
  | {
      readonly listed: true;
      readonly disclosure: "B1" | "B3" | "B6" | "B7" | "B8" | "B9" | "B10";
      readonly reference: string;
    };

export type KnowledgeHubReference =
  | {
      readonly status: "VERIFIED_PARAGRAPH";
      readonly paragraph: string;
      readonly url: string;
      readonly sharedByDatapointsInParagraph: true;
    }
  | {
      readonly status: "UNAVAILABLE";
      readonly legalSourceUrl: typeof VS2026_REGISTRY_STANDARD.eli;
      readonly reason: string;
    };

export type XbrlMapping =
  | {
      readonly status: "VERIFIED";
      readonly qname: `vs:${string}`;
      readonly packageVersion: typeof VS2026_XBRL_PACKAGE.packageVersion;
      readonly taxonomyDate: typeof VS2026_XBRL_PACKAGE.taxonomyDate;
      readonly namespace: typeof VS2026_XBRL_PACKAGE.namespace;
      readonly periodType: typeof VS2026_XBRL_PACKAGE.periodType;
      /** The audit data_type column is not treated as the XBRL item type. */
      readonly itemType: "UNVERIFIED";
      readonly dimensions?: readonly string[];
      readonly memberNamesFromAudit?: readonly string[];
      readonly note?: string;
    }
  | {
      readonly status: "UNVERIFIED";
      readonly reason: string;
    };

export type RegistryValue =
  | {
      readonly kind: "ENUMERATION";
      readonly members: readonly {
        readonly id: string;
        readonly legalText: string;
        readonly xbrlMember?: string;
      }[];
      readonly fullMemberList: "VERIFIED" | "NOT_REPRODUCED";
    }
  | {
      readonly kind: "ENUMERATION_SET";
      readonly classification: "APPENDIX_B_TOPICS" | "NACE_CODES";
      readonly fullMemberList: "NOT_REPRODUCED" | "REGULATORY_TOPIC_LIST";
    }
  | { readonly kind: "TEXT" }
  | { readonly kind: "NARRATIVE" }
  | { readonly kind: "BOOLEAN" }
  | {
      readonly kind: "NUMBER";
      readonly methodology?: "ONE_OF_HEADCOUNT_OR_FTE";
    }
  | {
      readonly kind: "MONETARY";
      readonly currency: "REPORTING_CURRENCY";
    }
  | { readonly kind: "GPS_LOCATION" }
  | {
      readonly kind: "EXPLICIT_STATEMENT";
      readonly bindsToDatapointId: "B1_MODULE_OPTION";
    }
  | {
      readonly kind: "REPEATING_REFERENCES";
      readonly cardinality: "ZERO_OR_MORE";
    }
  | {
      readonly kind: "QUANTITY";
      readonly reportedUnit: "MWh" | "tCO2eq" | "m3" | "WEIGHT" | "VOLUME";
      readonly inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR";
    }
  | {
      readonly kind: "DIMENSIONED_QUANTITY";
      readonly reportedUnit: "MWh";
      readonly inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR";
      readonly axes: readonly {
        readonly id: string;
        readonly legalMembers: readonly string[];
      }[];
    }
  | {
      readonly kind: "REPEATING_QUANTITY";
      readonly cardinality: "ZERO_OR_MORE";
      readonly maximum: null;
      readonly reportedUnit: "tCO2eq";
      readonly inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR";
      readonly categorySource: "GHG_PROTOCOL_SCOPE3_FIFTEEN_CATEGORIES";
      readonly categoryNames: "NOT_REPRODUCED";
    }
  | {
      readonly kind: "REPEATING_DIMENSIONED_QUANTITY";
      readonly cardinality: "ZERO_OR_MORE";
      readonly maximum: null;
      readonly environmentalMedium: "AIR" | "WATER" | "SOIL";
      readonly reportedUnit: "MASS_AS_REPORTED";
      readonly aggregation: "DO_NOT_AGGREGATE_INCOMPATIBLE_UNITS";
      readonly missingQuantity: "DO_NOT_TREAT_AS_ZERO";
      readonly axes: readonly {
        readonly id: "TypeOfPollutantAxis";
        readonly memberList: "NOT_REPRODUCED";
      }[];
    }
  | {
      readonly kind: "USER_DOCUMENT_REFERENCE";
      readonly referenceRole: "PUBLICLY_AVAILABLE_REPORTING_DOCUMENT";
      readonly distinctFrom: readonly [
        "ANNEX_I_PARAGRAPH_REFERENCE",
        "KNOWLEDGE_HUB_PARAGRAPH_URL",
        "REGULATION_ELI",
      ];
      readonly missingReference: "NOT_A_VALID_PUBLIC_REFERENCE";
      readonly arbitraryUrl: "NOT_SUFFICIENT";
      readonly externalFetch: "NOT_IMPLEMENTED";
    }
  | {
      readonly kind: "PROPORTION";
      readonly reportedUnit: "PERCENT";
      readonly zeroDenominator: "NOT_A_VALID_PERCENTAGE";
      readonly missingDenominator: "NOT_ZERO_PERCENT";
      readonly missingNumerator: "DO_NOT_TREAT_AS_ZERO";
    }
  | {
      readonly kind: "SITE_REFERENCE";
      readonly inventory: "B1_SITE";
      readonly identifierDatapointId: "B1_SITE_IDENTIFIER";
      readonly createsSecondInventory: false;
    }
  | {
      readonly kind: "WORKFORCE_COUNT";
      readonly measurementBasisDatapointId: "B8_MEASUREMENT_BASIS";
      readonly sharedEnumerationDatapointId: "B1_EMPLOYEE_COUNTING_METHODOLOGY";
      readonly headcountAndFte: "DO_NOT_ADD";
      readonly silentConversion: "NOT_PERMITTED";
      readonly oneFteEqualsOneEmployee: false;
      readonly distinctFromEmployeeSizeMeasure: "VS2026_EMPLOYEE_PROPORTIONALITY";
      readonly missingCount: "DO_NOT_TREAT_AS_ZERO";
      readonly reportedZero: "DISTINCT_FROM_MISSING";
    }
  | {
      readonly kind: "COUNT";
      readonly nonNegativeInteger: true;
      readonly missingCount: "DO_NOT_TREAT_AS_ZERO";
      readonly reportedZero: "DISTINCT_FROM_MISSING";
    }
  | {
      readonly kind: "ACCIDENT_RATE";
      readonly formula: "NOT_IMPLEMENTED";
      readonly zeroHours: "NOT_A_VALID_RATE";
      readonly missingHours: "NOT_A_VALID_RATE";
      readonly missingAccidents: "DO_NOT_TREAT_AS_ZERO";
    }
  | {
      readonly kind: "HOURS_WORKED";
      readonly originDatapointId: "B9_HOURS_WORKED_ORIGIN";
      readonly missingHours: "DO_NOT_TREAT_AS_ZERO";
      readonly zeroHours: "NOT_A_VALID_RATE_DENOMINATOR";
    }
  | {
      readonly kind: "COUNTRY_CODE";
      readonly codeList: "NOT_REPRODUCED";
      readonly axis: "CountryOfEmploymentContractAxis";
    }
  | {
      readonly kind: "PERCENTAGE";
      readonly reportedUnit: "PERCENT";
      readonly bounds: "ZERO_TO_100" | "NOT_ASSUMED";
      readonly missingValue: "DO_NOT_TREAT_AS_ZERO";
      readonly reportedZero: "DISTINCT_FROM_MISSING";
      readonly zeroDenominator: "NOT_A_VALID_PERCENTAGE";
    }
  | {
      readonly kind: "HOURS_AVERAGE";
      readonly reportedUnit: "HOURS_PER_EMPLOYEE";
      readonly denominator: "HEADCOUNT";
      readonly missingValue: "DO_NOT_TREAT_AS_ZERO";
      readonly reportedZero: "DISTINCT_FROM_MISSING";
      readonly doNotReuseFte: true;
    };

export type Paragraph22Reason = {
  readonly id: string;
  readonly point: "22(a)" | "22(b)" | "22(c)" | "22(d)";
  readonly text: string;
};

export type Vs2026Datapoint = {
  readonly id: string;
  readonly disclosure: RegistryDisclosureId;
  readonly module: "BASIC";
  readonly paragraph: string;
  readonly regulatoryStatement: string;
  readonly requirementType: RequirementType;
  readonly applicability: ApplicabilityCondition;
  readonly employeeSizeRule: EmployeeSizeRule;
  readonly annexII: AnnexIILink;
  readonly knowledgeHub: KnowledgeHubReference;
  readonly xbrl: XbrlMapping;
  readonly value: RegistryValue;
  readonly role:
    | "REGULATORY_DATAPOINT"
    | "DERIVED_FROM_REPORTING_CONFIGURATION"
    | "PREPARATION_GUIDANCE";
  readonly valueSource?: {
    readonly kind: "REPORTING_PERIOD_CONFIGURATION";
    readonly column: "vs2026ReportingOption";
    readonly reader: "getReportingConfiguration";
  };
  readonly omission?: {
    readonly identifiesEachOmittedDatapoint: true;
    readonly reasons: readonly Paragraph22Reason[];
    readonly reassessAtEachReportingDate: true;
    readonly separateFromApplicabilityState: true;
    readonly separateFromMateriality: true;
  };
  readonly repeatingGroupId?: string;
  readonly dataSourceNote?: string;
  readonly validationNote?: string;
  readonly informationClass?: InformationClass;
  readonly calculation?: CalculationBoundary;
  /** Checks reserved for a later validation engine. This phase does not run them. */
  readonly futureValidation?: readonly string[];
};

export type Vs2026RepeatingGroup = {
  readonly id: string;
  readonly disclosure: "B1" | "B4" | "B5" | "B6" | "B7" | "B8";
  readonly paragraph: string;
  readonly regulatoryStatement: string;
  readonly cardinality: "ZERO_OR_MORE";
  readonly maximum: null;
  readonly applicability: ApplicabilityCondition;
  readonly components: readonly Vs2026Datapoint[];
  readonly siteInventory?: "B1_SITE";
  readonly relationshipsPerSite?: "ZERO_OR_MORE";
};

export type Vs2026Disclosure = {
  readonly id: RegistryDisclosureId;
  readonly module: "BASIC";
  readonly standard: typeof VS2026_REGISTRY_STANDARD;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly datapoints: readonly Vs2026Datapoint[];
  readonly repeatingGroups: readonly Vs2026RepeatingGroup[];
  readonly guidanceDatapoints: readonly Vs2026Datapoint[];
  readonly relations?: readonly {
    readonly paragraph: string;
    readonly statement: string;
    readonly targetDisclosure: "C2";
    readonly whenReportingOption: "OPTION_B";
    readonly paragraph25Selection: "UNRESOLVED";
  }[];
  readonly presentationNotes?: readonly {
    readonly paragraph: string;
    readonly statement: string;
    readonly implemented: false;
  }[];
};

export function verifiedXbrl(
  qname: `vs:${string}`,
  extra?: {
    readonly dimensions?: readonly string[];
    readonly memberNamesFromAudit?: readonly string[];
    readonly note?: string;
  },
): XbrlMapping {
  return Object.freeze({
    status: "VERIFIED",
    qname,
    packageVersion: VS2026_XBRL_PACKAGE.packageVersion,
    taxonomyDate: VS2026_XBRL_PACKAGE.taxonomyDate,
    namespace: VS2026_XBRL_PACKAGE.namespace,
    periodType: VS2026_XBRL_PACKAGE.periodType,
    itemType: "UNVERIFIED",
    ...extra,
  });
}

export function unverifiedXbrl(reason: string): XbrlMapping {
  return Object.freeze({ status: "UNVERIFIED", reason });
}
