/**
 * Legal fixture transcribed from Annex II of Regulation (EU) 2026/1560.
 * Employee columns for the eight Comprehensive rows follow the EUR-Lex HTML
 * table read on 25 November 2026: empty at 10 employees or fewer, marked
 * above 10.
 *
 * This file is the test oracle. annexII.ts must not import it.
 */

export type AnnexIILegalFixtureRow = {
  readonly disclosure: string;
  readonly reference: string;
  readonly topic: string;
  readonly employeesLe10: boolean;
  readonly employeesGt10: boolean;
};

export const ANNEX_II_LEGAL_FIXTURE: readonly AnnexIILegalFixtureRow[] = [
  {
    disclosure: "B1",
    reference: "Para 27, point (a), subpoints (i) and (ii)",
    topic: "Selected module option (basic and/or comprehensive)",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B1",
    reference: "Para 27, point (c)",
    topic: "Choice of reporting basis (individual or consolidated)",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B1",
    reference: "Para 27, point (e), subpoints from (i) to (vii)",
    topic: "General undertaking's information",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B3",
    reference: "Para 32, first sentence",
    topic: "Total energy consumption in MWh",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B3",
    reference: "Para 33",
    topic: "Estimated absolute gross greenhouse gas (GHG) emissions",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B6",
    reference: "Para 36",
    topic: "Total water withdrawal",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B7",
    reference: "Para 38, first sentence",
    topic: "Circular economy principles application",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B7",
    reference: "Para 39, point (a)",
    topic:
      "Total weight of waste generated, with a breakdown between hazardous and non hazardous waste",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B7",
    reference: "Para 39, point (b)",
    topic: "Proportion of waste diverted to recycling or reuse",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "B8",
    reference: "Para 40, point (a)",
    topic:
      "Number of employees (in headcount or full-time equivalent) per type of employment contract",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B8",
    reference: "Para 40, point (b)",
    topic:
      "Number of employees (in headcount or full-time equivalent) per gender",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B9",
    reference: "Para 41, point (a)",
    topic: "Number and rate of recordable work-related accidents",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B10",
    reference: "Para 42, point (a)",
    topic:
      "Whether the employees receive pay that is equal or above applicable minimum wage for the country it reports on",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B10",
    reference: "Para 42, point (c)",
    topic: "Percentage of employees covered by collective bargaining agreements",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "B10",
    reference: "Para 42, point (d)",
    topic: "Average number of annual training hours per employee",
    employeesLe10: true,
    employeesGt10: true,
  },
  {
    disclosure: "C1",
    reference: "Para 46, point (a)",
    topic: "Description of significant groups of products and/or services offered",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C1",
    reference: "Para 46, point (b)",
    topic: "Description of significant market(s) the undertaking operates in",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C1",
    reference: "Para 46, point (c)",
    topic: "Description of main business relationships",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C5",
    reference: "Para 58",
    topic: "Employee turnover rate",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C6",
    reference: "Para 61, point (a)",
    topic: "Code of conduct or human rights policy",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C6",
    reference: "Para 61, point (c)",
    topic: "Complaints-handling mechanism",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C7",
    reference: "Para 62, point (a), subpoints from (i) to (v)",
    topic: "Confirmed incidents in its own workforce",
    employeesLe10: false,
    employeesGt10: true,
  },
  {
    disclosure: "C7",
    reference: "Para 62, point (c), first sentence",
    topic:
      "Confirmed incidents involving workers in the value chain, affected communities, consumers and end-users",
    employeesLe10: false,
    employeesGt10: true,
  },
];
