-- VSME v1→v2 migration metadata (non-destructive; preserves all rows)
ALTER TABLE "SustainabilityDataPoint"
  ADD COLUMN IF NOT EXISTS "legacyFieldId" TEXT,
  ADD COLUMN IF NOT EXISTS "migratedFieldId" TEXT,
  ADD COLUMN IF NOT EXISTS "migrationStatus" TEXT;
