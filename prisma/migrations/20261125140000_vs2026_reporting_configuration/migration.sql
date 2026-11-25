-- Additive VS 2026 reporting configuration on the reporting period.
-- Existing rows keep a null option. Nothing is backfilled from employee count.

ALTER TABLE "ReportingPeriod" ADD COLUMN "vs2026ReportingOption" TEXT;
ALTER TABLE "ReportingPeriod" ADD COLUMN "vs2026AdditionalComprehensiveDisclosures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
