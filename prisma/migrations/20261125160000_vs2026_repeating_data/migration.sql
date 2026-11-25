-- Additive VS 2026 repeating rows and cell values.
-- Existing reporting periods, sustainability datapoints, and materiality rows are not modified.
-- A child row may name a parent row only when both rows share reportingPeriodId.

-- CreateTable
CREATE TABLE "Vs2026RepeatingRow" (
    "id" TEXT NOT NULL,
    "reportingPeriodId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "parentRowId" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vs2026RepeatingRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vs2026RepeatingValue" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "datapointId" TEXT NOT NULL,
    "dimensionMember" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vs2026RepeatingValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vs2026RepeatingRow_reportingPeriodId_groupId_position_idx" ON "Vs2026RepeatingRow"("reportingPeriodId", "groupId", "position");

-- CreateIndex
CREATE INDEX "Vs2026RepeatingRow_parentRowId_idx" ON "Vs2026RepeatingRow"("parentRowId");

-- CreateIndex
CREATE UNIQUE INDEX "Vs2026RepeatingRow_id_reportingPeriodId_key" ON "Vs2026RepeatingRow"("id", "reportingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "Vs2026RepeatingValue_rowId_datapointId_dimensionMember_key" ON "Vs2026RepeatingValue"("rowId", "datapointId", "dimensionMember");

-- AddForeignKey
ALTER TABLE "Vs2026RepeatingRow" ADD CONSTRAINT "Vs2026RepeatingRow_reportingPeriodId_fkey" FOREIGN KEY ("reportingPeriodId") REFERENCES "ReportingPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vs2026RepeatingRow" ADD CONSTRAINT "Vs2026RepeatingRow_parentRowId_reportingPeriodId_fkey" FOREIGN KEY ("parentRowId", "reportingPeriodId") REFERENCES "Vs2026RepeatingRow"("id", "reportingPeriodId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vs2026RepeatingValue" ADD CONSTRAINT "Vs2026RepeatingValue_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "Vs2026RepeatingRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
