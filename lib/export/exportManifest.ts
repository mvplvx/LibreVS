export type ExportArtifactFormat = "xlsx" | "pdf";

export type ExportManifest = {
  exportId: string;
  reportingPeriodId: string;
  schemaVersion: string;
  exportedAt: string;
  exportedFieldCount: number;
  format: ExportArtifactFormat;
};

export function createExportManifest(input: {
  reportingPeriodId: string;
  schemaVersion: string;
  exportedFieldCount: number;
  format: ExportArtifactFormat;
  exportedAt?: string;
  exportId?: string;
}): ExportManifest {
  return {
    exportId: input.exportId ?? crypto.randomUUID(),
    reportingPeriodId: input.reportingPeriodId,
    schemaVersion: input.schemaVersion,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    exportedFieldCount: input.exportedFieldCount,
    format: input.format,
  };
}

export function serializeExportManifest(manifest: ExportManifest): string {
  return JSON.stringify(manifest);
}

export function parseExportManifest(serialized: string): ExportManifest | null {
  try {
    const parsed = JSON.parse(serialized) as ExportManifest;
    if (
      typeof parsed.exportId === "string" &&
      typeof parsed.reportingPeriodId === "string" &&
      typeof parsed.schemaVersion === "string" &&
      typeof parsed.exportedAt === "string" &&
      typeof parsed.exportedFieldCount === "number" &&
      (parsed.format === "xlsx" || parsed.format === "pdf")
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
