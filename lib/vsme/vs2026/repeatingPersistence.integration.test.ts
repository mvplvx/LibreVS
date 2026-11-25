import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";

import { prisma } from "../../db/prisma";
import { validateRepeatingParent } from "./repeatingIntegrity";

class RollbackSignal extends Error {}

function isKnownRequest(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

async function expectConstraint(
  tx: Prisma.TransactionClient,
  savepoint: string,
  code: string,
  run: () => Promise<unknown>,
): Promise<void> {
  await tx.$executeRawUnsafe(`SAVEPOINT ${savepoint}`);
  try {
    await run();
    assert.fail(`${savepoint} was accepted`);
  } catch (error) {
    if (error instanceof assert.AssertionError) {
      throw error;
    }
    assert.equal(isKnownRequest(error, code), true, `${savepoint} returned ${String(error)}`);
    await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
  await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepoint}`);
}

describe("VS 2026 repeating tables", () => {
  it("keeps rows, dimensions, and site references inside a rolled-back transaction", async () => {
    const beforePeriods = await prisma.reportingPeriod.count();
    const beforeDatapoints = await prisma.sustainabilityDataPoint.count();
    const beforeCompanies = await prisma.company.count();
    const beforeOrganizations = await prisma.organization.count();
    const migrationRows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE migration_name = '20261125160000_vs2026_repeating_data'
    `;
    assert.equal(migrationRows[0]?.count, 1);
    const tableBefore = await prisma.$queryRaw<{ name: string | null }[]>`
      SELECT to_regclass('"Vs2026RepeatingRow"')::text AS name
    `;
    assert.equal(tableBefore[0]?.name, '"Vs2026RepeatingRow"');

    try {
      await prisma.$transaction(
        async (tx) => {
          const company = await tx.company.findFirst({
            where: { organizationId: { not: null } },
          });
          assert.ok(company?.organizationId);
          const organizationId = company.organizationId;
          const year =
            ((
              await tx.reportingPeriod.aggregate({
                where: { companyId: company.id },
                _max: { year: true },
              })
            )._max.year ?? 2000) + 1;

          const periodA = await tx.reportingPeriod.create({
            data: { year, companyId: company.id, schemaVersion: "2.0.0" },
          });
          const periodB = await tx.reportingPeriod.create({
            data: { year: year + 1, companyId: company.id, schemaVersion: "2.0.0" },
          });

          const otherOrganization = await tx.organization.create({
            data: { name: "vs02-other-organization" },
          });
          const otherCompany = await tx.company.create({
            data: { name: "vs02-other-company", organizationId: otherOrganization.id },
          });
          const otherPeriod = await tx.reportingPeriod.create({
            data: { year, companyId: otherCompany.id, schemaVersion: "2.0.0" },
          });

          const sites = [];
          for (let index = 0; index < 6; index += 1) {
            sites.push(
              await tx.vs2026RepeatingRow.create({
                data: {
                  reportingPeriodId: periodA.id,
                  groupId: "B1_SITE",
                  position: index,
                },
              }),
            );
          }
          assert.equal(sites.length, 6);
          const site = sites[0];
          assert.ok(site);

          await tx.vs2026RepeatingValue.create({
            data: { rowId: site.id, datapointId: "B1_SITE_IDENTIFIER", value: "site-1" },
          });
          await tx.vs2026RepeatingValue.create({
            data: { rowId: site.id, datapointId: "B1_SITE_CITY", value: "Stockholm" },
          });
          const identifierBefore = await tx.vs2026RepeatingValue.findFirst({
            where: { rowId: site.id, datapointId: "B1_SITE_IDENTIFIER" },
          });
          const city = await tx.vs2026RepeatingValue.update({
            where: {
              rowId_datapointId_dimensionMember: {
                rowId: site.id,
                datapointId: "B1_SITE_CITY",
                dimensionMember: "",
              },
            },
            data: { value: "Gothenburg" },
          });
          const identifierAfter = await tx.vs2026RepeatingValue.findFirst({
            where: { rowId: site.id, datapointId: "B1_SITE_IDENTIFIER" },
          });
          assert.equal(city.id, (await tx.vs2026RepeatingValue.findUnique({ where: { id: city.id } }))?.id);
          assert.equal(identifierAfter?.id, identifierBefore?.id);
          assert.equal(identifierAfter?.value, "site-1");
          assert.equal(city.value, "Gothenburg");

          await expectConstraint(tx, "duplicate_city", "P2002", () =>
            tx.vs2026RepeatingValue.create({
              data: { rowId: site.id, datapointId: "B1_SITE_CITY", value: "Malmo" },
            }),
          );

          const missingGps = await tx.vs2026RepeatingValue.findFirst({
            where: { rowId: site.id, datapointId: "B1_SITE_GPS_LOCATION" },
          });
          assert.equal(missingGps, null);
          const reportedZero = await tx.vs2026RepeatingValue.create({
            data: { rowId: site.id, datapointId: "B8_EMPLOYEES_BY_COUNTRY", value: "0" },
          });
          const reportedFalse = await tx.vs2026RepeatingValue.create({
            data: { rowId: site.id, datapointId: "B4_PUBLIC_DISCLOSURE_FLAG", value: "false" },
          });
          assert.equal(reportedZero.value, "0");
          assert.equal(reportedFalse.value, "false");
          assert.notEqual(reportedZero.id, reportedFalse.id);

          const moved = await tx.vs2026RepeatingRow.update({
            where: { id: site.id },
            data: { position: 20 },
          });
          assert.equal(moved.id, site.id);
          assert.equal(moved.position, 20);

          for (let index = 0; index < 6; index += 1) {
            await tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B1_SUBSIDIARY",
                position: index,
              },
            });
          }
          for (let index = 0; index < 9; index += 1) {
            const pollutant = await tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B4_POLLUTANT",
                position: index,
              },
            });
            await tx.vs2026RepeatingValue.create({
              data: {
                rowId: pollutant.id,
                datapointId: "B4_POLLUTANT_IDENTITY",
                value: `pollutant-${index}`,
              },
            });
            await tx.vs2026RepeatingValue.create({
              data: { rowId: pollutant.id, datapointId: "B4_EMISSION_TO_AIR", value: String(index) },
            });
          }
          for (let index = 0; index < 6; index += 1) {
            await tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B7_MATERIAL",
                position: index,
              },
            });
            await tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
                position: index,
              },
            });
            await tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
                position: index,
              },
            });
          }

          assert.equal(
            await tx.vs2026RepeatingRow.count({
              where: { reportingPeriodId: periodA.id, groupId: "B1_SITE" },
            }),
            6,
          );
          assert.equal(
            await tx.vs2026RepeatingRow.count({
              where: { reportingPeriodId: periodA.id, groupId: "B4_POLLUTANT" },
            }),
            9,
          );

          const sameGroupOtherPeriod = await tx.vs2026RepeatingRow.create({
            data: { reportingPeriodId: periodB.id, groupId: "B1_SITE", position: 0 },
          });
          const periodAIds = (
            await tx.vs2026RepeatingRow.findMany({
              where: { reportingPeriodId: periodA.id, groupId: "B1_SITE" },
            })
          ).map((row) => row.id);
          assert.equal(periodAIds.includes(sameGroupOtherPeriod.id), false);

          const electricity = await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: periodA.id,
              groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
              position: 0,
            },
          });
          await tx.vs2026RepeatingValue.create({
            data: {
              rowId: electricity.id,
              datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
              dimensionMember: "Renewable energy",
              value: "10",
              unit: "MWh",
            },
          });
          await tx.vs2026RepeatingValue.create({
            data: {
              rowId: electricity.id,
              datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
              dimensionMember: "Non-renewable energy",
              value: "4",
              unit: "MWh",
            },
          });
          await expectConstraint(tx, "duplicate_dimension", "P2002", () =>
            tx.vs2026RepeatingValue.create({
              data: {
                rowId: electricity.id,
                datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
                dimensionMember: "Renewable energy",
                value: "99",
              },
            }),
          );

          const biodiversity = await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: periodA.id,
              groupId: "B5_SITE_BSA_RELATIONSHIP",
              parentRowId: site.id,
              position: 0,
            },
          });
          const secondBiodiversity = await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: periodA.id,
              groupId: "B5_SITE_ASSESSMENT",
              parentRowId: site.id,
              position: 1,
            },
          });
          const water = await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: periodA.id,
              groupId: "B6_WATER_STRESS_SITE",
              parentRowId: site.id,
              position: 0,
            },
          });
          assert.equal(biodiversity.parentRowId, site.id);
          assert.equal(secondBiodiversity.parentRowId, site.id);
          assert.equal(water.parentRowId, site.id);
          assert.equal(biodiversity.reportingPeriodId, site.reportingPeriodId);
          assert.deepEqual(
            validateRepeatingParent({
              groupId: biodiversity.groupId,
              reportingPeriodId: biodiversity.reportingPeriodId,
              parent: {
                id: site.id,
                groupId: site.groupId,
                reportingPeriodId: site.reportingPeriodId,
              },
            }),
            { ok: true },
          );

          await expectConstraint(tx, "cross_period_parent", "P2003", () =>
            tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodB.id,
                groupId: "B5_SITE_BSA_RELATIONSHIP",
                parentRowId: site.id,
                position: 0,
              },
            }),
          );
          assert.deepEqual(
            validateRepeatingParent({
              groupId: "B5_SITE_BSA_RELATIONSHIP",
              reportingPeriodId: periodB.id,
              parent: {
                id: site.id,
                groupId: site.groupId,
                reportingPeriodId: site.reportingPeriodId,
              },
            }),
            { ok: false, reason: "PARENT_PERIOD_MISMATCH" },
          );
          await expectConstraint(tx, "missing_parent", "P2003", () =>
            tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B5_SITE_ASSESSMENT",
                parentRowId: "missing-site-row",
                position: 2,
              },
            }),
          );

          const subsidiary = await tx.vs2026RepeatingRow.findFirst({
            where: { reportingPeriodId: periodA.id, groupId: "B1_SUBSIDIARY" },
          });
          assert.ok(subsidiary);
          const wrongGroupChild = await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: periodA.id,
              groupId: "B5_SITE_ASSESSMENT",
              parentRowId: subsidiary.id,
              position: 3,
            },
          });
          assert.equal(wrongGroupChild.parentRowId, subsidiary.id);
          assert.deepEqual(
            validateRepeatingParent({
              groupId: wrongGroupChild.groupId,
              reportingPeriodId: wrongGroupChild.reportingPeriodId,
              parent: {
                id: subsidiary.id,
                groupId: subsidiary.groupId,
                reportingPeriodId: subsidiary.reportingPeriodId,
              },
            }),
            { ok: false, reason: "PARENT_NOT_SITE" },
          );
          assert.deepEqual(
            validateRepeatingParent({
              groupId: "B6_WATER_STRESS_SITE",
              reportingPeriodId: periodA.id,
              parent: null,
            }),
            { ok: false, reason: "PARENT_REQUIRED" },
          );
          assert.deepEqual(
            validateRepeatingParent({
              groupId: "B7_MATERIAL",
              reportingPeriodId: periodA.id,
              parent: {
                id: site.id,
                groupId: site.groupId,
                reportingPeriodId: site.reportingPeriodId,
              },
            }),
            { ok: false, reason: "PARENT_NOT_ALLOWED" },
          );
          await tx.vs2026RepeatingRow.delete({ where: { id: wrongGroupChild.id } });

          await expectConstraint(tx, "delete_referenced_site", "P2003", () =>
            tx.vs2026RepeatingRow.delete({ where: { id: site.id } }),
          );

          const unreferenced = await tx.vs2026RepeatingRow.create({
            data: { reportingPeriodId: periodA.id, groupId: "B7_MATERIAL", position: 40 },
          });
          const unreferencedValue = await tx.vs2026RepeatingValue.create({
            data: { rowId: unreferenced.id, datapointId: "B7_MATERIAL_NAME", value: "Steel" },
          });
          await tx.vs2026RepeatingRow.delete({ where: { id: unreferenced.id } });
          assert.equal(
            await tx.vs2026RepeatingValue.findUnique({ where: { id: unreferencedValue.id } }),
            null,
          );

          const scalar = await tx.sustainabilityDataPoint.create({
            data: {
              reportingPeriodId: periodA.id,
              fieldId: "B1_TURNOVER",
              value: "100",
            },
          });
          await tx.vs2026RepeatingValue.update({
            where: { id: city.id },
            data: { value: "Uppsala" },
          });
          assert.equal(
            (await tx.sustainabilityDataPoint.findUnique({ where: { id: scalar.id } }))?.value,
            "100",
          );

          const otherSite = await tx.vs2026RepeatingRow.create({
            data: { reportingPeriodId: otherPeriod.id, groupId: "B1_SITE", position: 0 },
          });
          await expectConstraint(tx, "cross_organization_parent", "P2003", () =>
            tx.vs2026RepeatingRow.create({
              data: {
                reportingPeriodId: periodA.id,
                groupId: "B6_WATER_STRESS_SITE",
                parentRowId: otherSite.id,
                position: 4,
              },
            }),
          );
          const visible = await tx.vs2026RepeatingRow.findMany({
            where: {
              id: { in: [site.id, otherSite.id] },
              reportingPeriod: { company: { organizationId } },
            },
          });
          assert.deepEqual(
            visible.map((row) => row.id),
            [site.id],
          );

          await tx.reportingPeriod.delete({ where: { id: periodB.id } });
          assert.equal(
            await tx.vs2026RepeatingRow.count({ where: { reportingPeriodId: periodB.id } }),
            0,
          );
          await tx.sustainabilityDataPoint.delete({ where: { id: scalar.id } });
          await tx.reportingPeriod.delete({ where: { id: periodA.id } });
          assert.equal(
            await tx.vs2026RepeatingRow.count({ where: { reportingPeriodId: periodA.id } }),
            0,
          );
          assert.equal(await tx.vs2026RepeatingRow.findUnique({ where: { id: site.id } }), null);
          assert.equal(await tx.vs2026RepeatingRow.findUnique({ where: { id: biodiversity.id } }), null);

          throw new RollbackSignal();
        },
        { timeout: 20000 },
      );
      assert.fail("the repeating-table transaction committed");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }

    assert.equal(await prisma.reportingPeriod.count(), beforePeriods);
    assert.equal(await prisma.sustainabilityDataPoint.count(), beforeDatapoints);
    assert.equal(await prisma.company.count(), beforeCompanies);
    assert.equal(await prisma.organization.count(), beforeOrganizations);
    const tables = await prisma.$queryRaw<{ name: string | null }[]>`
      SELECT to_regclass('"Vs2026RepeatingRow"')::text AS name
    `;
    assert.equal(tables[0]?.name, '"Vs2026RepeatingRow"');
    const migrationsAfter = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE migration_name = '20261125160000_vs2026_repeating_data'
    `;
    assert.equal(migrationsAfter[0]?.count, 1);
    assert.equal(await prisma.vs2026RepeatingRow.count(), 0);
  });
});
