import type { ReportingConfigurationDb } from "./reportingConfiguration";

/** Serialises VS 2026 writes and report finalisation for one period. */
export async function lockVs2026ReportingPeriod(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
): Promise<void> {
  const key = `vs2026-report:${reportingPeriodId}`;
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
