-- Paragraph 22 assessment metadata on an existing omission cell.
-- The cell value remains the omitted datapoint id. The dimension member remains the paragraph 22 point.
-- Existing cells stay unattested. No reporting fact is rewritten.

ALTER TABLE "Vs2026RepeatingValue"
ADD COLUMN "omissionConditionsAssessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "omissionReassessedForPeriod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "omissionAssessedByUserId" TEXT,
ADD COLUMN "omissionAssessedAt" TIMESTAMP(3);
