import { createHash } from "node:crypto";

import {
  VS2026_REGULATORY_VERSION,
  VS2026_REPORT_FORMAT,
  type VS2026ReportDataset,
} from "./reportDataset";
import { hashReportDataset, stableStringify } from "./reportJson";

/** Dataset-only checksum used by VS-07A snapshots. */
export const VS2026_INTEGRITY_SCHEME_1 = "1" as const;
/**
 * Binds the dataset hash to the frozen finalisation record.
 * New snapshots use this scheme. Scheme 1 rows are still accepted.
 */
export const VS2026_INTEGRITY_SCHEME_2 = "2" as const;

export type SnapshotSeal = {
  integrityVersion: typeof VS2026_INTEGRITY_SCHEME_2;
  datasetHash: string;
  reportingPeriodId: string;
  organizationId: string;
  companyId: string;
  revision: number;
  regulatoryVersion: string;
  reportingOption: string;
  conformityStatement: string;
  finalisedByUserId: string;
  finalisedAt: string;
};

export type StoredSnapshotRow = {
  id: string;
  reportingPeriodId: string;
  organizationId: string;
  companyId: string;
  revision: number;
  regulatoryVersion: string;
  reportingOption: string;
  dataset: unknown;
  conformityStatement: string;
  contentHash: string;
  integrityVersion: string | null;
  sealHash: string | null;
  finalisedByUserId: string;
  finalisedAt: Date;
};

export type VerifiedReportSnapshot = {
  snapshotId: string;
  revision: number;
  finalisedAt: string;
  regulatoryVersion: string;
  reportingOption: "OPTION_A";
  conformityStatement: string;
  contentHash: string;
  integrityVersion: typeof VS2026_INTEGRITY_SCHEME_1 | typeof VS2026_INTEGRITY_SCHEME_2;
  dataset: VS2026ReportDataset;
};

export function hashSnapshotSeal(seal: SnapshotSeal): string {
  return createHash("sha256").update(stableStringify(seal)).digest("hex");
}

export function buildSnapshotSeal(input: Omit<SnapshotSeal, "integrityVersion" | "datasetHash"> & { dataset: VS2026ReportDataset }): {
  datasetHash: string;
  sealHash: string;
  seal: SnapshotSeal;
} {
  const datasetHash = hashReportDataset(input.dataset);
  const seal: SnapshotSeal = {
    integrityVersion: VS2026_INTEGRITY_SCHEME_2,
    datasetHash,
    reportingPeriodId: input.reportingPeriodId,
    organizationId: input.organizationId,
    companyId: input.companyId,
    revision: input.revision,
    regulatoryVersion: input.regulatoryVersion,
    reportingOption: input.reportingOption,
    conformityStatement: input.conformityStatement,
    finalisedByUserId: input.finalisedByUserId,
    finalisedAt: input.finalisedAt,
  };
  return { datasetHash, sealHash: hashSnapshotSeal(seal), seal };
}

export function verifyStoredSnapshot(row: StoredSnapshotRow): { ok: true; snapshot: VerifiedReportSnapshot } | { ok: false } {
  const dataset = row.dataset as VS2026ReportDataset;
  if (!isFinalDataset(dataset)) {
    return { ok: false };
  }
  if (hashReportDataset(dataset) !== row.contentHash) {
    return { ok: false };
  }
  if (dataset.conformityStatement?.text !== row.conformityStatement) {
    return { ok: false };
  }
  if (dataset.metadata.regulatoryVersion !== row.regulatoryVersion) {
    return { ok: false };
  }
  if (dataset.metadata.reportingOption !== row.reportingOption) {
    return { ok: false };
  }
  if (dataset.metadata.reportingPeriodId !== row.reportingPeriodId) {
    return { ok: false };
  }
  if (row.reportingOption !== "OPTION_A") {
    return { ok: false };
  }
  const scheme = row.integrityVersion ?? VS2026_INTEGRITY_SCHEME_1;
  if (scheme === VS2026_INTEGRITY_SCHEME_1) {
    if (row.sealHash !== null) {
      return { ok: false };
    }
    return { ok: true, snapshot: toVerified(row, dataset, VS2026_INTEGRITY_SCHEME_1) };
  }
  if (scheme !== VS2026_INTEGRITY_SCHEME_2 || row.sealHash === null) {
    return { ok: false };
  }
  const seal: SnapshotSeal = {
    integrityVersion: VS2026_INTEGRITY_SCHEME_2,
    datasetHash: row.contentHash,
    reportingPeriodId: row.reportingPeriodId,
    organizationId: row.organizationId,
    companyId: row.companyId,
    revision: row.revision,
    regulatoryVersion: row.regulatoryVersion,
    reportingOption: row.reportingOption,
    conformityStatement: row.conformityStatement,
    finalisedByUserId: row.finalisedByUserId,
    finalisedAt: row.finalisedAt.toISOString(),
  };
  if (hashSnapshotSeal(seal) !== row.sealHash) {
    return { ok: false };
  }
  return { ok: true, snapshot: toVerified(row, dataset, VS2026_INTEGRITY_SCHEME_2) };
}

function toVerified(
  row: StoredSnapshotRow,
  dataset: VS2026ReportDataset,
  integrityVersion: typeof VS2026_INTEGRITY_SCHEME_1 | typeof VS2026_INTEGRITY_SCHEME_2,
): VerifiedReportSnapshot {
  return {
    snapshotId: row.id,
    revision: row.revision,
    finalisedAt: row.finalisedAt.toISOString(),
    regulatoryVersion: row.regulatoryVersion,
    reportingOption: "OPTION_A",
    conformityStatement: row.conformityStatement,
    contentHash: row.contentHash,
    integrityVersion,
    dataset,
  };
}

function isFinalDataset(value: unknown): value is VS2026ReportDataset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const dataset = value as VS2026ReportDataset;
  return (
    dataset.metadata?.format === VS2026_REPORT_FORMAT &&
    dataset.metadata.status === "FINAL" &&
    dataset.metadata.regulatoryVersion === VS2026_REGULATORY_VERSION &&
    Array.isArray(dataset.disclosures) &&
    typeof dataset.undertaking?.name === "string" &&
    dataset.conformityStatement !== null &&
    typeof dataset.conformityStatement?.text === "string" &&
    dataset.conformityStatement.assuranceOpinion === false
  );
}
