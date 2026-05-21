-- AlterTable
ALTER TABLE "ReportingPeriod" ADD COLUMN "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0';

-- DropTable
DROP TABLE IF EXISTS "PortfolioView";
