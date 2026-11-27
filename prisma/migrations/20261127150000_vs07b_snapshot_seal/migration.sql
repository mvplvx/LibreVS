-- Additive integrity seal for new VS 2026 snapshots.
-- Existing rows stay on scheme 1 (both columns null). Their dataset hash is unchanged.

ALTER TABLE "Vs2026ReportSnapshot" ADD COLUMN "integrityVersion" TEXT;
ALTER TABLE "Vs2026ReportSnapshot" ADD COLUMN "sealHash" TEXT;
