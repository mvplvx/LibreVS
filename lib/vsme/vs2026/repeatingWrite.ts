import type { EditorMutationResult } from "./editorView";
import { runOptionAMutation, type EditorCaller } from "./editorWrite";
import {
  isEnergyGroup,
  isScope3Group,
  isSingletonGroup,
  OMISSION_GROUP_ID,
  repeatingGroupIsSupported,
  siteReferenceDatapointId,
  validateRepeatingValue,
} from "./repeatingForm";
import {
  NO_DIMENSION_MEMBER,
  validateRepeatingCell,
  validateRepeatingParent,
} from "./repeatingIntegrity";
import type { ReportingConfigurationDb, ReportingPeriodAccess } from "./reportingConfiguration";
import { registryDatapoint } from "./scalarEligibility";

const SITE_REFERENCED_MESSAGE =
  "This site is referenced by other disclosures. Remove or update those references before deleting the site.";

function fail(code: string, message: string): EditorMutationResult {
  return { ok: false, code, message };
}

async function lockGroup(
  db: ReportingConfigurationDb,
  reportingPeriodId: string,
  groupId: string,
): Promise<void> {
  const key = `vs2026:${reportingPeriodId}:${groupId}`;
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

async function ownedRow(
  db: ReportingConfigurationDb,
  access: ReportingPeriodAccess,
  rowId: string,
) {
  return db.vs2026RepeatingRow.findFirst({
    where: {
      id: rowId,
      reportingPeriodId: access.reportingPeriodId,
      reportingPeriod: { company: { organizationId: access.organizationId } },
    },
  });
}

function parentMessage(reason: string): string {
  if (reason === "PARENT_NOT_SITE") {
    return "Only a B1 site can be referenced. A subsidiary is not a site.";
  }
  if (reason === "PARENT_PERIOD_MISMATCH") {
    return "The site belongs to a different reporting period.";
  }
  if (reason === "PARENT_NOT_ALLOWED") {
    return "This group does not use a B1 site.";
  }
  return "Choose a B1 site from this reporting period.";
}

async function assertParent(
  db: ReportingConfigurationDb,
  access: ReportingPeriodAccess,
  groupId: string,
  parentRowId: string | null,
): Promise<EditorMutationResult | null> {
  if (parentRowId === null) {
    const decision = validateRepeatingParent({
      groupId,
      reportingPeriodId: access.reportingPeriodId,
      parent: null,
    });
    return decision.ok ? null : fail(decision.reason, parentMessage(decision.reason));
  }
  const parent = await db.vs2026RepeatingRow.findFirst({
    where: {
      id: parentRowId,
      reportingPeriodId: access.reportingPeriodId,
      reportingPeriod: { company: { organizationId: access.organizationId } },
    },
  });
  if (!parent) {
    return fail("PARENT_NOT_FOUND", "The selected site was not found in this reporting period.");
  }
  const decision = validateRepeatingParent({
    groupId,
    reportingPeriodId: access.reportingPeriodId,
    parent: {
      id: parent.id,
      groupId: parent.groupId,
      reportingPeriodId: parent.reportingPeriodId,
    },
  });
  return decision.ok ? null : fail(decision.reason, parentMessage(decision.reason));
}

async function writeSiteReference(
  db: ReportingConfigurationDb,
  rowId: string,
  groupId: string,
  parentRowId: string,
): Promise<EditorMutationResult | null> {
  const datapointId = siteReferenceDatapointId(groupId);
  if (!datapointId) {
    return fail("PARENT_REQUIRED", "Choose a B1 site from this reporting period.");
  }
  const cell = validateRepeatingCell({ rowGroupId: groupId, datapointId });
  if (!cell.ok) {
    return fail(cell.reason, "The site reference does not belong to this group.");
  }
  await db.vs2026RepeatingValue.upsert({
    where: {
      rowId_datapointId_dimensionMember: {
        rowId,
        datapointId,
        dimensionMember: NO_DIMENSION_MEMBER,
      },
    },
    create: {
      rowId,
      datapointId,
      dimensionMember: NO_DIMENSION_MEMBER,
      value: parentRowId,
      unit: null,
    },
    update: { value: parentRowId, unit: null },
  });
  return null;
}

export async function createRepeatingRow(
  input: EditorCaller & { groupId: string; parentRowId: string | null },
): Promise<EditorMutationResult> {
  const groupId = input.groupId.trim();
  const parentRowId = input.parentRowId?.trim() || null;
  return runOptionAMutation(input, async (tx, access) => {
    if (groupId === OMISSION_GROUP_ID) {
      return fail(
        "DEFERRED_LEGAL_WORKFLOW",
        "Paragraph 22 omissions are not approved from this editor.",
      );
    }
    if (!repeatingGroupIsSupported(groupId)) {
      return fail("UNKNOWN_GROUP", "This repeating group is not editable.");
    }
    if (isSingletonGroup(groupId)) {
      await lockGroup(tx, access.reportingPeriodId, groupId);
      const existing = await tx.vs2026RepeatingRow.findMany({
        where: { reportingPeriodId: access.reportingPeriodId, groupId },
        orderBy: { id: "asc" },
      });
      if (existing.length > 1) {
        return fail(
          "DUPLICATE_SINGLETON",
          "More than one row is stored for this group. Another row was not created.",
        );
      }
      if (existing.length === 1) {
        return { ok: true, code: "SAVED", rowId: existing[0].id };
      }
    }
    const parentError = await assertParent(tx, access, groupId, parentRowId);
    if (parentError) {
      return parentError;
    }
    const last = await tx.vs2026RepeatingRow.findFirst({
      where: { reportingPeriodId: access.reportingPeriodId, groupId },
      orderBy: { position: "desc" },
    });
    const created = await tx.vs2026RepeatingRow.create({
      data: {
        reportingPeriodId: access.reportingPeriodId,
        groupId,
        parentRowId,
        position: (last?.position ?? -1) + 1,
      },
    });
    if (parentRowId) {
      const referenceError = await writeSiteReference(tx, created.id, groupId, parentRowId);
      if (referenceError) {
        return referenceError;
      }
    }
    const confirmed = await tx.vs2026RepeatingRow.findFirst({
      where: { id: created.id, reportingPeriodId: access.reportingPeriodId },
    });
    if (!confirmed || confirmed.groupId !== groupId || confirmed.parentRowId !== parentRowId) {
      return fail("WRITE_NOT_CONFIRMED", "The row was not saved.");
    }
    return { ok: true, code: "SAVED", rowId: confirmed.id };
  });
}

export async function updateRepeatingCell(
  input: EditorCaller & {
    rowId: string;
    datapointId: string;
    value: string | null;
    dimensionMember?: string | null;
    expectedUpdatedAt?: string | null;
    overwrite?: boolean;
  },
): Promise<EditorMutationResult> {
  const rowId = input.rowId.trim();
  const datapointId = input.datapointId.trim();
  return runOptionAMutation(input, async (tx, access) => {
    const row = await ownedRow(tx, access, rowId);
    if (!row) {
      return fail("ROW_NOT_FOUND", "The row was not found in this reporting period.");
    }
    if (row.groupId === OMISSION_GROUP_ID) {
      return fail(
        "DEFERRED_LEGAL_WORKFLOW",
        "Paragraph 22 omissions are not approved from this editor.",
      );
    }
    const membership = validateRepeatingCell({ rowGroupId: row.groupId, datapointId });
    if (!membership.ok) {
      return fail(
        membership.reason,
        membership.reason === "UNKNOWN_DATAPOINT"
          ? "This field is not a VS 2026 datapoint."
          : "This field does not belong to the row's group.",
      );
    }
    const datapoint = registryDatapoint(datapointId);
    if (!datapoint) {
      return fail("UNKNOWN_DATAPOINT", "This field is not a VS 2026 datapoint.");
    }
    if (isSingletonGroup(row.groupId)) {
      await lockGroup(tx, access.reportingPeriodId, row.groupId);
      const siblings = await tx.vs2026RepeatingRow.count({
        where: { reportingPeriodId: access.reportingPeriodId, groupId: row.groupId },
      });
      if (siblings !== 1) {
        return fail(
          "DUPLICATE_SINGLETON",
          "More than one row is stored for this group. The value was not saved.",
        );
      }
    }
    const validated = validateRepeatingValue({
      datapoint,
      raw: input.value,
      dimensionMember: input.dimensionMember ?? null,
    });
    if (!validated.ok) {
      return fail(validated.code, validated.message);
    }
    if (validated.value !== null && (isScope3Group(row.groupId) || isEnergyGroup(row.groupId))) {
      const clash = await tx.vs2026RepeatingValue.findFirst({
        where: {
          datapointId,
          dimensionMember: validated.dimensionMember,
          row: { reportingPeriodId: access.reportingPeriodId, groupId: row.groupId },
          NOT: { rowId: row.id },
        },
      });
      if (clash) {
        return fail("DUPLICATE_FACT", "That category or energy member is already stored.");
      }
    }
    const where = {
      rowId_datapointId_dimensionMember: {
        rowId: row.id,
        datapointId,
        dimensionMember: validated.dimensionMember,
      },
    };
    const current = await tx.vs2026RepeatingValue.findUnique({ where });
    const expected = input.overwrite === true ? undefined : input.expectedUpdatedAt;
    if (expected !== undefined && (current ? current.updatedAt.toISOString() : null) !== expected) {
      return fail(
        "CONFLICT",
        "This value changed after you opened it. Your draft is still here. Reload the stored value before replacing it, or choose to replace the stored value.",
      );
    }
    if (validated.value === null) {
      await tx.vs2026RepeatingValue.deleteMany({
        where: { rowId: row.id, datapointId, dimensionMember: validated.dimensionMember },
      });
      const after = await tx.vs2026RepeatingValue.findUnique({ where });
      if (after) {
        return fail("WRITE_NOT_CONFIRMED", "The value was not cleared.");
      }
      return { ok: true, code: "CLEARED", rowId: row.id, updatedAt: null };
    }
    await tx.vs2026RepeatingValue.upsert({
      where,
      create: {
        rowId: row.id,
        datapointId,
        dimensionMember: validated.dimensionMember,
        value: validated.value,
        unit: validated.unit,
      },
      update: { value: validated.value, unit: validated.unit },
    });
    const after = await tx.vs2026RepeatingValue.findUnique({ where });
    if (
      !after ||
      after.value !== validated.value ||
      (after.unit ?? null) !== validated.unit ||
      after.dimensionMember !== validated.dimensionMember
    ) {
      return fail("WRITE_NOT_CONFIRMED", "The value was not saved.");
    }
    return { ok: true, code: "SAVED", rowId: row.id, updatedAt: after.updatedAt.toISOString() };
  });
}

export async function reorderRepeatingRow(
  input: EditorCaller & { rowId: string; direction: "up" | "down" },
): Promise<EditorMutationResult> {
  const rowId = input.rowId.trim();
  return runOptionAMutation(input, async (tx, access) => {
    const row = await ownedRow(tx, access, rowId);
    if (!row) {
      return fail("ROW_NOT_FOUND", "The row was not found in this reporting period.");
    }
    if (isSingletonGroup(row.groupId) || row.groupId === OMISSION_GROUP_ID) {
      return fail("REORDER_NOT_AVAILABLE", "This group is not reordered.");
    }
    const rows = await tx.vs2026RepeatingRow.findMany({
      where: { reportingPeriodId: access.reportingPeriodId, groupId: row.groupId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    const index = rows.findIndex((item) => item.id === row.id);
    const swapWith = input.direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= rows.length) {
      return { ok: true, code: "SAVED", rowId: row.id };
    }
    const ordered = [...rows];
    const current = ordered[index];
    ordered[index] = ordered[swapWith];
    ordered[swapWith] = current;
    for (let position = 0; position < ordered.length; position += 1) {
      if (ordered[position].position !== position) {
        await tx.vs2026RepeatingRow.update({
          where: { id: ordered[position].id },
          data: { position },
        });
      }
    }
    const confirmed = await tx.vs2026RepeatingRow.findMany({
      where: { reportingPeriodId: access.reportingPeriodId, groupId: row.groupId },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    if (confirmed.map((item) => item.id).join("\0") !== ordered.map((item) => item.id).join("\0")) {
      return fail("WRITE_NOT_CONFIRMED", "The order was not saved.");
    }
    return { ok: true, code: "SAVED", rowId: row.id };
  });
}

export async function deleteRepeatingRow(
  input: EditorCaller & { rowId: string },
): Promise<EditorMutationResult> {
  const rowId = input.rowId.trim();
  return runOptionAMutation(input, async (tx, access) => {
    const row = await ownedRow(tx, access, rowId);
    if (!row) {
      return fail("ROW_NOT_FOUND", "The row was not found in this reporting period.");
    }
    const dependents = await tx.vs2026RepeatingRow.count({
      where: { parentRowId: row.id, reportingPeriodId: access.reportingPeriodId },
    });
    if (dependents > 0) {
      return fail("SITE_REFERENCED", SITE_REFERENCED_MESSAGE);
    }
    await tx.vs2026RepeatingRow.delete({ where: { id: row.id } });
    const after = await tx.vs2026RepeatingRow.findFirst({
      where: { id: row.id, reportingPeriodId: access.reportingPeriodId },
    });
    if (after) {
      return fail("WRITE_NOT_CONFIRMED", "The row was not deleted.");
    }
    return { ok: true, code: "CLEARED", rowId: row.id };
  });
}

export async function setRepeatingParent(
  input: EditorCaller & { rowId: string; parentRowId: string },
): Promise<EditorMutationResult> {
  const rowId = input.rowId.trim();
  const parentRowId = input.parentRowId.trim();
  return runOptionAMutation(input, async (tx, access) => {
    const row = await ownedRow(tx, access, rowId);
    if (!row) {
      return fail("ROW_NOT_FOUND", "The row was not found in this reporting period.");
    }
    const parentError = await assertParent(tx, access, row.groupId, parentRowId);
    if (parentError) {
      return parentError;
    }
    await tx.vs2026RepeatingRow.update({
      where: { id: row.id },
      data: { parentRowId },
    });
    const referenceError = await writeSiteReference(tx, row.id, row.groupId, parentRowId);
    if (referenceError) {
      return referenceError;
    }
    const confirmed = await tx.vs2026RepeatingRow.findFirst({
      where: { id: row.id, reportingPeriodId: access.reportingPeriodId },
    });
    if (!confirmed || confirmed.parentRowId !== parentRowId) {
      return fail("WRITE_NOT_CONFIRMED", "The site reference was not saved.");
    }
    return { ok: true, code: "SAVED", rowId: row.id };
  });
}

export async function saveOmissionClaim(
  input: EditorCaller & {
    omittedDatapointId: string;
    reason: string;
    conditionsAssessed: boolean;
    reassessedForPeriod: boolean;
    rowId?: string | null;
  },
): Promise<EditorMutationResult> {
  const omittedDatapointId = input.omittedDatapointId.trim();
  const reason = input.reason.trim();
  return runOptionAMutation(input, async (tx, access, userId) => {
    if (omittedDatapointId === OMISSION_GROUP_ID || omittedDatapointId === "B1_MODULE_OPTION") {
      return fail("NOT_EDITABLE", "That datapoint cannot be omitted from this workflow.");
    }
    if (!registryDatapoint(omittedDatapointId)) {
      return fail("UNKNOWN_DATAPOINT", "Choose a datapoint from the VS 2026 registry.");
    }
    const reasons = registryDatapoint(OMISSION_GROUP_ID)?.omission?.reasons ?? [];
    if (!reasons.some((item) => item.point === reason)) {
      return fail("INVALID_VALUE", "Choose a paragraph 22 reason.");
    }
    if (typeof input.conditionsAssessed !== "boolean" || typeof input.reassessedForPeriod !== "boolean") {
      return fail("INVALID_VALUE", "Record both omission confirmations explicitly.");
    }
    await lockGroup(tx, access.reportingPeriodId, OMISSION_GROUP_ID);
    const cells = await tx.vs2026RepeatingValue.findMany({
      where: {
        datapointId: OMISSION_GROUP_ID,
        row: { reportingPeriodId: access.reportingPeriodId, groupId: OMISSION_GROUP_ID },
      },
    });
    const requestedRowId = input.rowId?.trim() || null;
    if (cells.some((cell) => cell.value === omittedDatapointId && cell.rowId !== requestedRowId)) {
      return fail("DUPLICATE_FACT", "That datapoint already has an omission claim in this reporting period.");
    }
    let rowId = requestedRowId;
    if (rowId) {
      const row = await ownedRow(tx, access, rowId);
      if (!row || row.groupId !== OMISSION_GROUP_ID) {
        return fail("ROW_NOT_FOUND", "The omission claim was not found in this reporting period.");
      }
    } else {
      const last = await tx.vs2026RepeatingRow.findFirst({
        where: { reportingPeriodId: access.reportingPeriodId, groupId: OMISSION_GROUP_ID },
        orderBy: { position: "desc" },
      });
      const created = await tx.vs2026RepeatingRow.create({
        data: {
          reportingPeriodId: access.reportingPeriodId,
          groupId: OMISSION_GROUP_ID,
          parentRowId: null,
          position: (last?.position ?? -1) + 1,
        },
      });
      rowId = created.id;
    }
    await tx.vs2026RepeatingValue.deleteMany({
      where: { rowId, datapointId: OMISSION_GROUP_ID, NOT: { dimensionMember: reason } },
    });
    const attested = input.conditionsAssessed || input.reassessedForPeriod;
    const saved = await tx.vs2026RepeatingValue.upsert({
      where: {
        rowId_datapointId_dimensionMember: {
          rowId,
          datapointId: OMISSION_GROUP_ID,
          dimensionMember: reason,
        },
      },
      create: {
        rowId,
        datapointId: OMISSION_GROUP_ID,
        dimensionMember: reason,
        value: omittedDatapointId,
        unit: null,
        omissionConditionsAssessed: input.conditionsAssessed,
        omissionReassessedForPeriod: input.reassessedForPeriod,
        omissionAssessedByUserId: attested ? userId : null,
        omissionAssessedAt: attested ? new Date() : null,
      },
      update: {
        value: omittedDatapointId,
        omissionConditionsAssessed: input.conditionsAssessed,
        omissionReassessedForPeriod: input.reassessedForPeriod,
        omissionAssessedByUserId: attested ? userId : null,
        omissionAssessedAt: attested ? new Date() : null,
      },
    });
    return { ok: true, code: "SAVED", rowId, updatedAt: saved.updatedAt.toISOString() };
  });
}
