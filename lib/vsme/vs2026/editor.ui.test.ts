import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Vs2026Editor } from "../../../components/vsme/vs2026/Vs2026Editor";
import type { EditorReadyView } from "./editorView";

const view: EditorReadyView = {
  reportingPeriodId: "period-1",
  year: 2026,
  companyName: "Northwind",
  configurationStatus: "NOT_CONFIGURED",
  additionalComprehensiveDisclosures: ["C5"],
  employeeMeasure: null,
  employeeLocked: false,
  employeeCategoryLabel: "Employee-size category not determined",
  previewHref: "/vsme/vs2026/preview/period-1",
  repeatingGroups: [],
  sites: [],
  energyBreakdownLabel: "Breakdown information has not been assessed. Stored energy values stay visible.",
  omissionTargets: [],
  omissionReasons: [],
  comparativeBasis: "UNKNOWN",
  comparativeUpdatedAt: null,
  disclosures: [
    {
      id: "B1",
      title: "Basis for preparation",
      fields: [
        {
          id: "B1_COUNTRY_PRIMARY_OPERATIONS",
          label: "country of primary operations",
          paragraph: "27(e)(vi)",
          preparation: false,
          control: { kind: "text" },
          value: null,
          updatedAt: null,
          locked: false,
        },
      ],
      unavailable: [
        {
          id: "B1_MODULE_OPTION",
          label: "reporting option",
          paragraph: "27(a)",
          reason: "This value is derived from the saved reporting option.",
        },
      ],
      repeating: [
        {
          id: "B1_SITE",
          statement: "sites owned, leased or managed",
          components: [{ id: "B1_SITE_IDENTIFIER", label: "identity of a site" }],
        },
      ],
    },
  ],
};

describe("VS 2026 editor presentation", () => {
  it("shows Option A, the proportionality input, and unavailable facts without a compliance claim", () => {
    const html = renderToStaticMarkup(
      createElement(Vs2026Editor, { view, refresh: () => undefined }),
    );
    assert.equal(html.includes("Option A — Basic Module"), true);
    assert.equal(html.includes("Reporting option not configured"), true);
    assert.equal(html.includes("Employee-size category not determined"), true);
    assert.equal(html.includes("C5"), true);
    assert.equal(html.includes("B1_MODULE_OPTION"), true);
    assert.equal(html.includes("B1_SITE_IDENTIFIER"), true);
    assert.equal(html.includes("/vsme/vs2026/preview/period-1"), true);
    assert.equal(html.includes("not a legal compliance assessment"), true);
    assert.equal(html.includes("Save Option A"), true);
    assert.equal(html.includes("Compliant"), false);
  });
});
