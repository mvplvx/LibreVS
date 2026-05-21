-- VSME schema-driven storage: fieldId replaces category/key

DELETE FROM "SustainabilityDataPoint";

DROP INDEX IF EXISTS "SustainabilityDataPoint_reportingPeriodId_category_key_key";

ALTER TABLE "SustainabilityDataPoint" DROP COLUMN "category",
DROP COLUMN "key";

ALTER TABLE "SustainabilityDataPoint" ADD COLUMN "fieldId" TEXT NOT NULL;

CREATE UNIQUE INDEX "SustainabilityDataPoint_reportingPeriodId_fieldId_key" ON "SustainabilityDataPoint"("reportingPeriodId", "fieldId");
