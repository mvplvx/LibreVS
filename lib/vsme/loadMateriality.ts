import { prisma } from "@/lib/db/prisma";
import { buildMaterialityMap, parseMateriality } from "./materiality";
import type { VsmeMateriality } from "./materiality";

export async function loadMaterialityForPeriod(
  reportingPeriodId: string
): Promise<Record<string, VsmeMateriality>> {
  const rows = await prisma.vsmeFieldMateriality.findMany({
    where: { reportingPeriodId },
    select: { fieldId: true, materiality: true },
  });
  return buildMaterialityMap(rows);
}

/** Upserts per-field overrides; uses @@unique([reportingPeriodId, fieldId]). */
export async function upsertMaterialityForPeriod(
  reportingPeriodId: string,
  items: Array<{ fieldId: string; materiality: VsmeMateriality }>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const normalized = items.map((item) => ({
    fieldId: item.fieldId,
    materiality: parseMateriality(item.materiality),
  }));

  await prisma.$transaction(
    normalized.map((item) =>
      prisma.vsmeFieldMateriality.upsert({
        where: {
          reportingPeriodId_fieldId: {
            reportingPeriodId,
            fieldId: item.fieldId,
          },
        },
        create: {
          reportingPeriodId,
          fieldId: item.fieldId,
          materiality: item.materiality,
        },
        update: {
          materiality: item.materiality,
        },
      })
    )
  );
}
