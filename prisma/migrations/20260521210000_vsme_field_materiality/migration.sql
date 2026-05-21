CREATE TABLE "VsmeFieldMateriality" (
    "id" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "materiality" TEXT NOT NULL DEFAULT 'material',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VsmeFieldMateriality_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VsmeFieldMateriality_reportingPeriodId_fieldId_key" ON "VsmeFieldMateriality"("reportingPeriodId", "fieldId");

ALTER TABLE "VsmeFieldMateriality" ADD CONSTRAINT "VsmeFieldMateriality_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
