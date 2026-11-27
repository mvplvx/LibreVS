import { createHash } from "node:crypto";

import {
  VS2026_REGULATORY_VERSION,
  VS2026_REPORT_FORMAT,
  VS2026_REPORT_FORMAT_VERSION,
  type VS2026ReportDataset,
} from "./reportDataset";

export type VS2026ReportFile = {
  format: typeof VS2026_REPORT_FORMAT;
  formatVersion: typeof VS2026_REPORT_FORMAT_VERSION;
  status: "DRAFT" | "FINAL";
  regulatoryVersion: typeof VS2026_REGULATORY_VERSION;
  description: "LibreVS structured VS 2026 report. This is not an EFRAG XBRL filing or an official EFRAG digital template.";
  snapshotId: string | null;
  revision: number | null;
  finalisedAt: string | null;
  finalisedByUserId: string | null;
  contentHash: string;
  dataset: VS2026ReportDataset;
};

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashReportDataset(dataset: VS2026ReportDataset): string {
  return createHash("sha256").update(stableStringify(dataset)).digest("hex");
}

export function renderDraftReportFile(dataset: VS2026ReportDataset): string {
  const draft: VS2026ReportDataset = {
    ...dataset,
    metadata: { ...dataset.metadata, status: "DRAFT" },
    conformityStatement: null,
  };
  return renderFile({
    status: "DRAFT",
    snapshotId: null,
    revision: null,
    finalisedAt: null,
    finalisedByUserId: null,
    contentHash: hashReportDataset(draft),
    dataset: draft,
  });
}

export function renderFinalReportFile(input: {
  snapshotId: string;
  revision: number;
  finalisedAt: string;
  finalisedByUserId: string;
  contentHash: string;
  dataset: VS2026ReportDataset;
}): string {
  if (input.dataset.metadata.status !== "FINAL" || input.dataset.conformityStatement === null) {
    throw new Error("A final VS 2026 report requires the undertaking declaration.");
  }
  return renderFile({
    status: "FINAL",
    snapshotId: input.snapshotId,
    revision: input.revision,
    finalisedAt: input.finalisedAt,
    finalisedByUserId: input.finalisedByUserId,
    contentHash: input.contentHash,
    dataset: input.dataset,
  });
}

function renderFile(file: Omit<VS2026ReportFile, "format" | "formatVersion" | "regulatoryVersion" | "description">): string {
  const body: VS2026ReportFile = {
    format: VS2026_REPORT_FORMAT,
    formatVersion: VS2026_REPORT_FORMAT_VERSION,
    regulatoryVersion: VS2026_REGULATORY_VERSION,
    description:
      "LibreVS structured VS 2026 report. This is not an EFRAG XBRL filing or an official EFRAG digital template.",
    ...file,
  };
  return `${stableStringify(body)}\n`;
}
