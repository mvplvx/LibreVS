-- Version token for scalar autosave.
-- Existing rows receive the migration time. createdAt is unchanged.
-- The column is not a reporting fact.

ALTER TABLE "SustainabilityDataPoint"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
