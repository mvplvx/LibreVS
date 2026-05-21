-- CreateTable
CREATE TABLE "SustainabilityDataPoint" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "reportingPeriodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SustainabilityDataPoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SustainabilityDataPoint" ADD CONSTRAINT "SustainabilityDataPoint_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
