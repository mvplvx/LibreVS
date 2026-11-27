-- VS 2026 report origin and immutable Option A snapshots.
-- Existing scalar rows stay null: a value without this origin is not a VS 2026 fact.
-- Legacy VSME export snapshots are unchanged.

ALTER TABLE "SustainabilityDataPoint"
ADD COLUMN "reportingOrigin" TEXT;

CREATE TABLE "Vs2026ReportSnapshot" (
    "id" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "regulatoryVersion" TEXT NOT NULL,
    "reportingOption" TEXT NOT NULL,
    "dataset" JSONB NOT NULL,
    "conformityStatement" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "finalisedByUserId" TEXT NOT NULL,
    "finalisedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vs2026ReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vs2026ReportSnapshot_reportingPeriodId_revision_key"
ON "Vs2026ReportSnapshot"("reportingPeriodId", "revision");

CREATE INDEX "Vs2026ReportSnapshot_reportingPeriodId_idx"
ON "Vs2026ReportSnapshot"("reportingPeriodId");

CREATE INDEX "Vs2026ReportSnapshot_organizationId_idx"
ON "Vs2026ReportSnapshot"("organizationId");

ALTER TABLE "Vs2026ReportSnapshot"
ADD CONSTRAINT "Vs2026ReportSnapshot_reportingPeriodId_fkey"
FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
