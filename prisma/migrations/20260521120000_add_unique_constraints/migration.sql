-- CreateIndex
CREATE UNIQUE INDEX "SustainabilityDataPoint_reportingPeriodId_category_key_key" ON "SustainabilityDataPoint"("reportingPeriodId", "category", "key");
