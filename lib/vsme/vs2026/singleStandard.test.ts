import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { reportingStandardFromOption } from "./reportingStandard";

const root = join(import.meta.dirname, "../../..");

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("VS 2026 single-standard identity", () => {
  it("treats a missing option as unconfigured and keeps Option B unsupported by identity", () => {
    assert.deepEqual(reportingStandardFromOption(null), { kind: "UNCONFIGURED" });
    assert.deepEqual(reportingStandardFromOption("OPTION_A"), { kind: "VS2026", option: "OPTION_A" });
    assert.deepEqual(reportingStandardFromOption("OPTION_B"), { kind: "VS2026", option: "OPTION_B" });
    assert.deepEqual(reportingStandardFromOption("LEGACY"), { kind: "INVALID" });
    assert.equal(source("lib/vsme/vs2026/reportingStandard.ts").includes("LEGACY_VSME"), false);
  });

  it("keeps the dashboard and entry pages off the retired workspace", () => {
    const dashboard = source("app/dashboard/page.tsx");
    const entry = source("app/vsme/page.tsx");
    const review = source("app/vsme/export-review/page.tsx");
    for (const file of [dashboard, entry, review]) {
      assert.equal(file.includes("VSMEFormRenderer"), false);
      assert.equal(file.includes("ExportCenter"), false);
      assert.equal(file.includes("useVsmeDashboard"), false);
    }
    assert.equal(dashboard.includes("Choose Option A"), true);
    assert.equal(dashboard.includes("/vsme/vs2026/edit/"), true);
    assert.equal(entry.includes("retired"), true);
  });

  it("retires legacy report routes without calling the old generators", () => {
    const routes = [
      "app/api/data-point/route.ts",
      "app/api/reporting-period/[id]/materiality/route.ts",
      "app/api/reporting-period/[id]/export/route.ts",
      "app/api/reporting-period/[id]/export/json/route.ts",
      "app/api/reporting-period/[id]/export/xlsx/route.ts",
      "app/api/reporting-period/[id]/export/pdf/route.ts",
      "app/api/reporting-period/[id]/dashboard/route.ts",
      "app/api/vsme/schema/route.ts",
      "app/api/vsme/ui-schema/route.ts",
      "app/api/vsme/applicability/route.ts",
    ];
    for (const route of routes) {
      const text = source(route);
      assert.equal(text.includes("retiredReportingResponse") || text.includes("retiredPeriodRoute") || text.includes("retiredDataPointWrite"), true, route);
      assert.equal(text.includes("xlsxExporter"), false, route);
      assert.equal(text.includes("pdfExporter"), false, route);
      assert.equal(text.includes("vsme.fieldRegistry"), false, route);
      assert.equal(text.includes("getReportingState"), false, route);
    }
  });
});
