import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import { evaluateVS2026ReportingState } from "./evaluation";
import { loadVs2026Editor } from "./editorLoad";
import { saveVs2026EditorScalar, saveVs2026OptionA } from "./editorWrite";
import { coverageInventory } from "./repeatingForm";
import {
  createRepeatingRow,
  deleteRepeatingRow,
  reorderRepeatingRow,
  updateRepeatingCell,
} from "./repeatingWrite";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { getVS2026RegulatoryPreview } from "./regulatoryPreview";

class RollbackSignal extends Error {}

const ELECTRICITY = "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY";
const FUELS = "B3_ENERGY_CONSUMPTION_FROM_FUELS";
const SCOPE3 = "B3_SCOPE3_SIGNIFICANT_CATEGORIES";

describe("VS 2026 repeating editor", () => {
  it("saves repeating rows, site references, and dimensioned energy through the evaluator", async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({ data: { name: "VS-05B1 organisation" } });
        const otherOrganization = await tx.organization.create({ data: { name: "VS-05B1 other" } });
        const company = await tx.company.create({
          data: { name: "VS-05B1 company", organizationId: organization.id, currency: "EUR", employeeCount: 650 },
        });
        const otherCompany = await tx.company.create({
          data: { name: "VS-05B1 other company", organizationId: otherOrganization.id, currency: "EUR" },
        });
        const period = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: company.id, schemaVersion: "2.0.0" },
        });
        const otherPeriod = await tx.reportingPeriod.create({
          data: { year: 2027, companyId: company.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
        });
        const foreignPeriod = await tx.reportingPeriod.create({
          data: { year: 2026, companyId: otherCompany.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
        });
        const identity = { userId: "vs05b1-user", organizationId: organization.id };
        const request = new Request("http://localhost/vsme/vs2026/edit", {
          headers: { "x-user-id": "forged-user", "x-organization-id": otherOrganization.id },
        });
        const caller = {
          request,
          db: tx,
          resolveIdentity: async () => identity,
          isEnabled: () => true,
        };

        const beforeOption = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: "B1_SITE",
          parentRowId: null,
        });
        assert.equal(beforeOption.code, "CONFIGURATION_REQUIRED");

        assert.equal((await saveVs2026OptionA({ ...caller, reportingPeriodId: period.id })).ok, true);
        const scalar = await saveVs2026EditorScalar({
          ...caller,
          reportingPeriodId: period.id,
          datapointId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
          value: "42",
        });
        assert.equal(scalar.ok, true);

        const siteIds: string[] = [];
        for (let index = 0; index < 6; index += 1) {
          const created = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B1_SITE",
            parentRowId: null,
          });
          assert.equal(created.ok, true);
          assert.ok(created.ok && created.rowId);
          siteIds.push(created.rowId);
          const named = await updateRepeatingCell({
            ...caller,
            reportingPeriodId: period.id,
            rowId: created.rowId,
            datapointId: "B1_SITE_IDENTIFIER",
            value: `Site ${index + 1}`,
          });
          assert.equal(named.ok, true);
        }
        assert.equal(new Set(siteIds).size, 6);

        const subsidiaryIds: string[] = [];
        for (let index = 0; index < 6; index += 1) {
          const created = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B1_SUBSIDIARY",
            parentRowId: null,
          });
          assert.ok(created.ok && created.rowId);
          subsidiaryIds.push(created.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: created.rowId,
                datapointId: "B1_SUBSIDIARY_NAME",
                value: `Subsidiary ${index + 1}`,
              })
            ).ok,
            true,
          );
        }
        const moved = await reorderRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          rowId: subsidiaryIds[0],
          direction: "down",
        });
        assert.equal(moved.ok, true);
        const ordered = await tx.vs2026RepeatingRow.findMany({
          where: { reportingPeriodId: period.id, groupId: "B1_SUBSIDIARY" },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        assert.deepEqual(
          ordered.map((row) => row.id),
          [subsidiaryIds[1], subsidiaryIds[0], ...subsidiaryIds.slice(2)],
        );
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: subsidiaryIds[1],
              datapointId: "B1_SUBSIDIARY_NAME",
              value: null,
            })
          ).code,
          "CLEARED",
        );
        assert.equal(
          await tx.vs2026RepeatingValue.count({
            where: { rowId: subsidiaryIds[1], datapointId: "B1_SUBSIDIARY_NAME" },
          }),
          0,
        );
        assert.equal(
          (await tx.vs2026RepeatingRow.findUnique({ where: { id: subsidiaryIds[1] } }))?.id,
          subsidiaryIds[1],
        );

        for (let index = 0; index < 9; index += 1) {
          const created = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B4_POLLUTANT",
            parentRowId: null,
          });
          assert.ok(created.ok && created.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: created.rowId,
                datapointId: "B4_EMISSION_TO_AIR",
                value: String(index),
              })
            ).ok,
            true,
          );
          const stored = await tx.vs2026RepeatingValue.findFirst({
            where: { rowId: created.rowId, datapointId: "B4_EMISSION_TO_AIR" },
          });
          assert.equal(stored?.unit, null);
          assert.equal(stored?.dimensionMember, "");
        }
        for (let index = 0; index < 6; index += 1) {
          const material = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B7_MATERIAL",
            parentRowId: null,
          });
          assert.ok(material.ok && material.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: material.rowId,
                datapointId: "B7_MATERIAL_NAME",
                value: `Material ${index + 1}`,
              })
            ).ok,
            true,
          );
          const country = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
            parentRowId: null,
          });
          assert.ok(country.ok && country.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: country.rowId,
                datapointId: "B8_EMPLOYEES_BY_COUNTRY",
                value: String(index),
              })
            ).ok,
            true,
          );
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: country.rowId,
                datapointId: "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
                value: "SE",
              })
            ).ok,
            true,
          );
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: country.rowId,
                datapointId: "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
                value: "Sweden",
              })
            ).code,
            "INVALID_VALUE",
          );
        }

        const siteCountry = await updateRepeatingCell({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[0],
          datapointId: "B1_SITE_COUNTRY",
          value: "SE",
        });
        assert.equal(siteCountry.ok, true);
        const siteCountryName = await updateRepeatingCell({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[0],
          datapointId: "B1_SITE_COUNTRY",
          value: "Sweden",
        });
        assert.equal(siteCountryName.code, "INVALID_VALUE");
        const siteGps = await updateRepeatingCell({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[0],
          datapointId: "B1_SITE_GPS_LOCATION",
          value: "59.3293,18.0686",
        });
        assert.equal(siteGps.ok, true);
        const siteGpsInvalid = await updateRepeatingCell({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[0],
          datapointId: "B1_SITE_GPS_LOCATION",
          value: "91,18",
        });
        assert.equal(siteGpsInvalid.code, "INVALID_VALUE");
        const subsidiaryParent = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: "B5_SITE_ASSESSMENT",
          parentRowId: subsidiaryIds[0],
        });
        assert.equal(subsidiaryParent.code, "PARENT_NOT_SITE");
        const otherSite = await createRepeatingRow({
          ...caller,
          reportingPeriodId: otherPeriod.id,
          groupId: "B1_SITE",
          parentRowId: null,
        });
        assert.ok(otherSite.ok && otherSite.rowId);
        const crossPeriod = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: "B5_SITE_ASSESSMENT",
          parentRowId: otherSite.rowId,
        });
        assert.equal(crossPeriod.code, "PARENT_NOT_FOUND");

        const assessmentIds: string[] = [];
        for (const siteId of [siteIds[0], siteIds[0]]) {
          const assessment = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId: "B5_SITE_ASSESSMENT",
            parentRowId: siteId,
          });
          assert.ok(assessment.ok && assessment.rowId);
          assessmentIds.push(assessment.rowId);
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: assessment.rowId,
                datapointId: "B5_SITE_BSA_ASSESSMENT",
                value: "NO_IDENTIFIED_RELATIONSHIP",
              })
            ).ok,
            true,
          );
        }
        const relationship = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: "B5_SITE_BSA_RELATIONSHIP",
          parentRowId: siteIds[0],
        });
        assert.ok(relationship.ok && relationship.rowId);
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: relationship.rowId,
              datapointId: "B5_BSA_NAME",
              value: "Nearby area",
            })
          ).ok,
          true,
        );
        const water = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: "B6_WATER_STRESS_SITE",
          parentRowId: siteIds[0],
        });
        assert.ok(water.ok && water.rowId);
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: water.rowId,
              datapointId: "B6_WATER_STRESS_SITE_CONSUMPTION",
              value: "0",
            })
          ).ok,
          true,
        );
        const waterUnit = await tx.vs2026RepeatingValue.findFirst({
          where: { rowId: water.rowId, datapointId: "B6_WATER_STRESS_SITE_CONSUMPTION" },
        });
        assert.equal(waterUnit?.value, "0");
        assert.equal(waterUnit?.unit, "m3");
        const referencedDelete = await deleteRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[0],
        });
        assert.equal(referencedDelete.code, "SITE_REFERENCED");
        assert.match(referencedDelete.ok ? "" : referencedDelete.message, /referenced by other disclosures/);
        assert.equal(await tx.vs2026RepeatingRow.count({ where: { parentRowId: siteIds[0] } }), 4);
        const unreferenced = await deleteRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          rowId: siteIds[5],
        });
        assert.equal(unreferenced.code, "CLEARED");
        assert.equal(await tx.vs2026RepeatingRow.findUnique({ where: { id: siteIds[5] } }), null);
        assert.equal(await tx.vs2026RepeatingRow.findUnique({ where: { id: siteIds[4] } }) !== null, true);

        const members = ["Renewable energy", "Non-renewable energy", "Total"] as const;
        for (const groupId of [ELECTRICITY, FUELS]) {
          const created = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId,
            parentRowId: null,
          });
          assert.ok(created.ok && created.rowId);
          const again = await createRepeatingRow({
            ...caller,
            reportingPeriodId: period.id,
            groupId,
            parentRowId: null,
          });
          assert.equal(again.ok && again.rowId, created.rowId);
          for (const member of members) {
            const value = member === "Renewable energy" && groupId === ELECTRICITY ? "0" : "3.5";
            assert.equal(
              (
                await updateRepeatingCell({
                  ...caller,
                  reportingPeriodId: period.id,
                  rowId: created.rowId,
                  datapointId: groupId,
                  value,
                  dimensionMember: member,
                })
              ).ok,
              true,
            );
          }
          const invalid = await updateRepeatingCell({
            ...caller,
            reportingPeriodId: period.id,
            rowId: created.rowId,
            datapointId: groupId,
            value: "1",
            dimensionMember: "Invented member",
          });
          assert.equal(invalid.code, "INVALID_DIMENSION");
          const missing = await updateRepeatingCell({
            ...caller,
            reportingPeriodId: period.id,
            rowId: created.rowId,
            datapointId: groupId,
            value: "1",
            dimensionMember: "",
          });
          assert.equal(missing.code, "INVALID_DIMENSION");
          const cells = await tx.vs2026RepeatingValue.findMany({ where: { rowId: created.rowId } });
          assert.equal(cells.length, 3);
          assert.ok(cells.every((cell) => cell.unit === "MWh"));
          if (groupId === ELECTRICITY) {
            assert.equal(cells.find((cell) => cell.dimensionMember === "Renewable energy")?.value, "0");
          }
        }
        assert.equal(
          await tx.vs2026RepeatingRow.count({ where: { reportingPeriodId: period.id, groupId: ELECTRICITY } }),
          1,
        );

        const categories = await createRepeatingRow({
          ...caller,
          reportingPeriodId: period.id,
          groupId: SCOPE3,
          parentRowId: null,
        });
        assert.ok(categories.ok && categories.rowId);
        for (const category of ["Purchased goods", "Business travel"]) {
          assert.equal(
            (
              await updateRepeatingCell({
                ...caller,
                reportingPeriodId: period.id,
                rowId: categories.rowId,
                datapointId: SCOPE3,
                value: "1.25",
                dimensionMember: category,
              })
            ).ok,
            true,
          );
        }
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: categories.rowId,
              datapointId: SCOPE3,
              value: "9",
              dimensionMember: "Purchased goods",
            })
          ).ok,
          true,
        );
        const categoryCells = await tx.vs2026RepeatingValue.findMany({
          where: { rowId: categories.rowId },
          orderBy: { dimensionMember: "asc" },
        });
        assert.deepEqual(
          categoryCells.map((cell) => [cell.dimensionMember, cell.value, cell.unit]),
          [
            ["Business travel", "1.25", "tCO2eq"],
            ["Purchased goods", "9", "tCO2eq"],
          ],
        );

        assert.equal(
          (
            await createRepeatingRow({
              ...caller,
              reportingPeriodId: period.id,
              groupId: "B1_OMITTED_DISCLOSURES",
              parentRowId: null,
            })
          ).code,
          "DEFERRED_LEGAL_WORKFLOW",
        );
        assert.equal(
          (
            await createRepeatingRow({
              ...caller,
              reportingPeriodId: period.id,
              groupId: "NOT_A_GROUP",
              parentRowId: null,
            })
          ).code,
          "UNKNOWN_GROUP",
        );
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: siteIds[1],
              datapointId: "NOT_A_DATAPOINT",
              value: "x",
            })
          ).code,
          "UNKNOWN_DATAPOINT",
        );
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: subsidiaryIds[2],
              datapointId: "B1_SITE_IDENTIFIER",
              value: "wrong group",
            })
          ).code,
          "GROUP_MISMATCH",
        );
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: period.id,
              rowId: "cmguessedrowid000000000001",
              datapointId: "B1_SITE_IDENTIFIER",
              value: "guessed",
            })
          ).code,
          "ROW_NOT_FOUND",
        );
        assert.equal(
          (
            await updateRepeatingCell({
              ...caller,
              reportingPeriodId: foreignPeriod.id,
              rowId: siteIds[1],
              datapointId: "B1_SITE_IDENTIFIER",
              value: "foreign",
            })
          ).code,
          "PERIOD_NOT_FOUND",
        );
        assert.equal(
          (
            await createRepeatingRow({
              ...caller,
              reportingPeriodId: period.id,
              groupId: "B1_SITE",
              parentRowId: null,
              isEnabled: () => false,
            })
          ).code,
          "EDITOR_DISABLED",
        );

        const loaded = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId: organization.id },
          tx,
        );
        if (!loaded.ok) {
          throw new Error(JSON.stringify(loaded.issues));
        }
        assert.ok(loaded.loaded.rows.filter((row) => row.groupId === "B1_SITE").length >= 5);
        const facts = loaded.loaded.input.facts ?? [];
        assert.equal(facts.some((fact) => fact.datapointId === "B3_TOTAL_ENERGY_CONSUMPTION_MWH"), true);
        const renewable = facts.find(
          (fact) => fact.datapointId === ELECTRICITY && fact.dimensionMember === "Renewable energy",
        );
        assert.equal(renewable?.presence.kind, "PRESENT");
        if (renewable?.presence.kind === "PRESENT" && renewable.presence.literal.kind === "NUMBER") {
          assert.equal(renewable.presence.literal.value, 0);
          assert.equal(renewable.unit, "MWh");
        } else {
          assert.fail("renewable electricity was not loaded");
        }
        assert.equal(
          facts.some((fact) => fact.datapointId === ELECTRICITY && fact.dimensionMember === "Missing member"),
          false,
        );
        const report = evaluateVS2026ReportingState(loaded.loaded.input);
        assert.equal(report.ignoredGroupIds.includes(SCOPE3), true);
        assert.equal(report.ignoredGroupIds.includes(ELECTRICITY), false);
        const electricityFacts = report.datapoints.filter((item) => item.datapointId === ELECTRICITY);
        assert.equal(electricityFacts.length, 3);
        const preview = await getVS2026RegulatoryPreview({
          reportingPeriodId: period.id,
          request,
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => identity,
        });
        assert.equal(preview.ok, true);
        if (preview.ok) {
          assert.equal(
            preview.view.diagnostics.some((line) => line.includes(`Ignored group: ${SCOPE3}`)),
            true,
          );
        }
        const editor = await loadVs2026Editor({
          reportingPeriodId: period.id,
          request,
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => identity,
        });
        assert.equal(editor.status, "READY");
        if (editor.status === "READY") {
          assert.equal(editor.view.sites.length, 5);
          assert.equal(editor.view.sites.some((site) => site.label === "Site 1"), true);
          const energy = editor.view.repeatingGroups.find((group) => group.id === ELECTRICITY);
          assert.equal(energy?.rows[0]?.cells.length, 3);
          assert.equal(energy?.rows[0]?.cells.find((cell) => cell.dimensionMember === "Renewable energy")?.value, "0");
        }
        assert.equal(
          (
            await tx.sustainabilityDataPoint.findUnique({
              where: {
                reportingPeriodId_fieldId: {
                  reportingPeriodId: period.id,
                  fieldId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
                },
              },
            })
          )?.value,
          "42",
        );
        throw new RollbackSignal();
      }, { timeout: 30_000 });
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }
    assert.equal(await prisma.company.count({ where: { name: "VS-05B1 company" } }), 0);
  });

  it("keeps one electricity row when two creates run together", async () => {
    const organization = await prisma.organization.create({ data: { name: "VS-05B1 concurrent" } });
    const company = await prisma.company.create({
      data: { name: "VS-05B1 concurrent company", organizationId: organization.id, currency: "EUR" },
    });
    const period = await prisma.reportingPeriod.create({
      data: { year: 2033, companyId: company.id, schemaVersion: "2.0.0", vs2026ReportingOption: "OPTION_A" },
    });
    try {
      const caller = {
        request: new Request("http://localhost/vsme/vs2026/edit"),
        db: prisma,
        resolveIdentity: async () => ({ userId: "vs05b1-concurrent", organizationId: organization.id }),
        isEnabled: () => true,
        reportingPeriodId: period.id,
        groupId: ELECTRICITY,
        parentRowId: null,
      };
      const [first, second] = await Promise.all([
        createRepeatingRow(caller),
        createRepeatingRow(caller),
      ]);
      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      assert.equal(first.ok && second.ok && first.rowId === second.rowId, true);
      assert.equal(
        await prisma.vs2026RepeatingRow.count({
          where: { reportingPeriodId: period.id, groupId: ELECTRICITY },
        }),
        1,
      );
    } finally {
      await prisma.reportingPeriod.deleteMany({ where: { id: period.id } });
      await prisma.company.deleteMany({ where: { id: company.id } });
      await prisma.organization.deleteMany({ where: { id: organization.id } });
    }
  });
});

describe("VS 2026 coverage inventory", () => {
  it("classifies every registry definition once", () => {
    const inventory = coverageInventory();
    assert.equal(inventory.length, 112);
    assert.equal(new Set(inventory.map((item) => item.id)).size, 112);
    const counts = new Map<string, number>();
    for (const item of inventory) {
      counts.set(item.coverage, (counts.get(item.coverage) ?? 0) + 1);
    }
    assert.deepEqual(Object.fromEntries([...counts.entries()].sort()), {
      BLOCKED_LEGACY_COLLISION: 3,
      BLOCKED_UNVERIFIED_CONTROL: 2,
      CALCULATED: 1,
      DEFERRED_LEGAL_WORKFLOW: 1,
      DERIVED: 1,
      DIGITAL_ONLY: 3,
      EDITABLE_DIMENSIONED: 2,
      EDITABLE_REPEATING: 21,
      EDITABLE_SCALAR: 47,
      PREPARATION_INPUT: 31,
    });
  });
});
