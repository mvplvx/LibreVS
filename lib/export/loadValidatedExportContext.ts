import { prisma } from "@/lib/db/prisma";
import { librevsLog } from "@/lib/observability/librevsLog";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import {
  buildExportRows,
  validateExportCompleteness,
  type VsmeExportRow,
  type VsmeExportValidationResult,
} from "@/lib/vsme/exportMapping";
import { assertSystemReadyForExport } from "@/lib/vsme/release/readinessCheck";

export type ValidatedExportContext = {
  reportingPeriodId: string;
  companyId: string;
  companyName: string;
  year: number;
  schemaVersion: string;
  employeeCount: number;
  rows: VsmeExportRow[];
  validation: VsmeExportValidationResult;
  mandatoryCoveragePercentage: number;
  missingRequiredCount: number;
};

export type ExportContextResult =
  | { ok: true; context: ValidatedExportContext }
  | {
      ok: false;
      error: string;
      validation?: VsmeExportValidationResult;
      readinessBlocked?: boolean;
    };

export async function loadValidatedExportContext(
  reportingPeriodId: string,
  organizationId: string
): Promise<ExportContextResult> {
  const period = await prisma.reportingPeriod.findFirst({
    where: {
      id: reportingPeriodId,
      company: { organizationId },
    },
    include: { company: { select: { name: true } } },
  });

  if (!period) {
    return { ok: false, error: "Reporting period not found" };
  }

  const readinessGate = await assertSystemReadyForExport();
  if (!readinessGate.ok) {
    librevsLog("export.readiness_blocked", {
      reportingPeriodId,
      systemHealth: readinessGate.readiness.systemHealth,
      blockers: readinessGate.readiness.blockers,
    });
    return {
      ok: false,
      error: readinessGate.message,
      readinessBlocked: true,
    };
  }

  const data = await loadPeriodIntelligence(reportingPeriodId, organizationId);
  if (!data) {
    return { ok: false, error: "Reporting period not found" };
  }

  const { vsme } = data;
  const reportedIds = vsme.values.map((v) => v.fieldId);
  const validation = validateExportCompleteness(
    data.employeeCount,
    reportedIds,
    data.materialityByFieldId
  );

  if (!validation.exportReady) {
    librevsLog("export.validation_blocked", {
      reportingPeriodId,
      missingMandatoryCount: validation.missingFieldIds.length,
      missingFieldIds: validation.missingFieldIds.slice(0, 20),
      errors: validation.errors,
    });
    return {
      ok: false,
      error: "Export validation failed",
      validation,
    };
  }

  const dataPoints = vsme.values.map((v) => ({
    fieldId: v.fieldId,
    value: v.value,
    unit: v.unit,
  }));

  const rows = buildExportRows(
    data.employeeCount,
    dataPoints,
    data.materialityByFieldId
  );

  return {
    ok: true,
    context: {
      reportingPeriodId: data.reportingPeriodId,
      companyId: data.companyId,
      companyName: period.company.name,
      year: data.year,
      schemaVersion: data.schemaVersion,
      employeeCount: data.employeeCount,
      rows,
      validation,
      mandatoryCoveragePercentage: vsme.requiredCoveragePercentage,
      missingRequiredCount: vsme.completeness.missingRequiredFields.length,
    },
  };
}
