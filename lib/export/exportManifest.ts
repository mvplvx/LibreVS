import { computeRegistryHash } from "@/lib/vsme/registryHash";

export type ExportArtifactFormat = "xlsx" | "pdf";

export type ExportManifest = {
  exportId: string;
  reportingPeriodId: string;
  schemaVersion: string;
  exportedAt: string;
  exportedFieldCount: number;
  format: ExportArtifactFormat;
  registryHash: string;
};

export function createExportManifest(input: {
  reportingPeriodId: string;
  schemaVersion: string;
  exportedFieldCount: number;
  format: ExportArtifactFormat;
  exportedAt?: string;
  exportId?: string;
  registryHash?: string;
}): ExportManifest {
  return {
    exportId: input.exportId ?? crypto.randomUUID(),
    reportingPeriodId: input.reportingPeriodId,
    schemaVersion: input.schemaVersion,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    exportedFieldCount: input.exportedFieldCount,
    format: input.format,
    registryHash: input.registryHash ?? computeRegistryHash(),
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
      (parsed.format === "xlsx" || parsed.format === "pdf") &&
      typeof parsed.registryHash === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
