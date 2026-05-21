/**
 * Idempotent VSME v1 → v2 datapoint migration (non-destructive).
 * Usage: npx tsx scripts/migrate-vsme-v1-to-v2.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { classifyDataPointForMigration } from "../lib/vsme/migration/dataPointMigration";
import { resolveReportingPeriodSchemaVersion } from "../lib/vsme/migration/schemaVersion";
import { isRegisteredFieldId } from "../lib/vsme/vsme.fieldRegistry";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type Stats = {
  scanned: number;
  v2Native: number;
  updated: number;
  skipped: number;
  migrated: number;
  legacyOnly: number;
  unmapped: number;
  periodsUpdated: number;
};

async function main() {
  const stats: Stats = {
    scanned: 0,
    v2Native: 0,
    updated: 0,
    skipped: 0,
    migrated: 0,
    legacyOnly: 0,
    unmapped: 0,
    periodsUpdated: 0,
  };

  const rows = await prisma.sustainabilityDataPoint.findMany({
    orderBy: [{ reportingPeriodId: "asc" }, { fieldId: "asc" }],
  });

  console.log(
    `[migrate-vsme] Scanning ${rows.length} SustainabilityDataPoint row(s)${dryRun ? " (dry-run)" : ""}…`
  );

  for (const row of rows) {
    stats.scanned += 1;

    if (isRegisteredFieldId(row.fieldId)) {
      stats.v2Native += 1;
      if (
        row.legacyFieldId ||
        row.migratedFieldId ||
        row.migrationStatus
      ) {
        if (!dryRun) {
          await prisma.sustainabilityDataPoint.update({
            where: { id: row.id },
            data: {
              legacyFieldId: null,
              migratedFieldId: null,
              migrationStatus: null,
            },
          });
        }
        stats.updated += 1;
      } else {
        stats.skipped += 1;
      }
      continue;
    }

    const patch = classifyDataPointForMigration(row.fieldId);
    if (!patch) {
      stats.skipped += 1;
      continue;
    }

    const unchanged =
      row.legacyFieldId === patch.legacyFieldId &&
      row.migratedFieldId === patch.migratedFieldId &&
      row.migrationStatus === patch.migrationStatus;

    if (unchanged) {
      stats.skipped += 1;
    } else if (!dryRun) {
      await prisma.sustainabilityDataPoint.update({
        where: { id: row.id },
        data: patch,
      });
      stats.updated += 1;
    } else {
      stats.updated += 1;
    }

    if (patch.migrationStatus === "migrated") {
      stats.migrated += 1;
    } else if (patch.migrationStatus === "legacy_only") {
      stats.legacyOnly += 1;
    } else {
      stats.unmapped += 1;
    }
  }

  const periods = await prisma.reportingPeriod.findMany({
    include: {
      sustainabilityDataPoints: {
        select: {
          fieldId: true,
          legacyFieldId: true,
          migratedFieldId: true,
          migrationStatus: true,
        },
      },
    },
  });

  for (const period of periods) {
    const targetVersion = resolveReportingPeriodSchemaVersion(
      period.sustainabilityDataPoints.map((dp) => ({
        fieldId: dp.fieldId,
        legacyFieldId: dp.legacyFieldId,
        migratedFieldId: dp.migratedFieldId,
        migrationStatus: dp.migrationStatus,
      }))
    );

    if (period.schemaVersion !== targetVersion) {
      if (!dryRun) {
        await prisma.reportingPeriod.update({
          where: { id: period.id },
          data: { schemaVersion: targetVersion },
        });
      }
      stats.periodsUpdated += 1;
      console.log(
        `[migrate-vsme] Period ${period.id} (${period.year}): schemaVersion ${period.schemaVersion} → ${targetVersion}`
      );
    }
  }

  console.log("[migrate-vsme] Done.", stats);
}

main()
  .catch((error) => {
    console.error("[migrate-vsme] Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
