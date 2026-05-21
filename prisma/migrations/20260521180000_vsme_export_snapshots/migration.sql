-- CreateTable
CREATE TABLE "VsmeExportSnapshot" (
    "id" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stateSnapshot" JSONB NOT NULL,
    "exportData" JSONB NOT NULL,
    "validationResult" JSONB NOT NULL,
    "reportingState" TEXT NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,

    CONSTRAINT "VsmeExportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VsmeExportSnapshot_reportingPeriodId_idx" ON "VsmeExportSnapshot"("reportingPeriodId");

-- CreateIndex
CREATE INDEX "VsmeExportSnapshot_companyId_idx" ON "VsmeExportSnapshot"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "VsmeExportSnapshot_reportingPeriodId_version_key" ON "VsmeExportSnapshot"("reportingPeriodId", "version");

-- AddForeignKey
ALTER TABLE "VsmeExportSnapshot" ADD CONSTRAINT "VsmeExportSnapshot_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
