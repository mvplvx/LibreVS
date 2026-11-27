"use server";

import { headers } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import type { EditorMutationResult } from "@/lib/vsme/vs2026/editorView";
import {
  saveVs2026EditorScalar,
  saveVs2026EmployeeMeasure,
  saveVs2026OptionA,
} from "@/lib/vsme/vs2026/editorWrite";
import {
  createRepeatingRow,
  deleteRepeatingRow,
  reorderRepeatingRow,
  saveOmissionClaim,
  setRepeatingParent,
  updateRepeatingCell,
} from "@/lib/vsme/vs2026/repeatingWrite";

async function currentRequest(): Promise<Request> {
  const current = await headers();
  return new Request("http://localhost/vsme/vs2026/edit", { headers: current });
}

export async function saveOptionAAction(reportingPeriodId: string): Promise<EditorMutationResult> {
  return saveVs2026OptionA({
    request: await currentRequest(),
    reportingPeriodId,
    db: prisma,
  });
}

export async function saveEmployeeMeasureAction(
  reportingPeriodId: string,
  value: string | null,
  confirmed: boolean,
): Promise<EditorMutationResult> {
  return saveVs2026EmployeeMeasure({
    request: await currentRequest(),
    reportingPeriodId,
    value,
    confirmed,
    db: prisma,
  });
}

export async function createRepeatingRowAction(
  reportingPeriodId: string,
  groupId: string,
  parentRowId: string | null,
): Promise<EditorMutationResult> {
  return createRepeatingRow({
    request: await currentRequest(),
    reportingPeriodId,
    groupId,
    parentRowId,
    db: prisma,
  });
}

export async function updateRepeatingCellAction(
  reportingPeriodId: string,
  rowId: string,
  datapointId: string,
  value: string | null,
  dimensionMember: string | null,
  expectedUpdatedAt?: string | null,
  overwrite?: boolean,
): Promise<EditorMutationResult> {
  return updateRepeatingCell({
    request: await currentRequest(),
    reportingPeriodId,
    rowId,
    datapointId,
    value,
    dimensionMember,
    expectedUpdatedAt,
    overwrite,
    db: prisma,
  });
}

export async function reorderRepeatingRowAction(
  reportingPeriodId: string,
  rowId: string,
  direction: "up" | "down",
): Promise<EditorMutationResult> {
  return reorderRepeatingRow({
    request: await currentRequest(),
    reportingPeriodId,
    rowId,
    direction,
    db: prisma,
  });
}

export async function deleteRepeatingRowAction(
  reportingPeriodId: string,
  rowId: string,
): Promise<EditorMutationResult> {
  return deleteRepeatingRow({
    request: await currentRequest(),
    reportingPeriodId,
    rowId,
    db: prisma,
  });
}

export async function setRepeatingParentAction(
  reportingPeriodId: string,
  rowId: string,
  parentRowId: string,
): Promise<EditorMutationResult> {
  return setRepeatingParent({
    request: await currentRequest(),
    reportingPeriodId,
    rowId,
    parentRowId,
    db: prisma,
  });
}

export async function saveScalarAction(
  reportingPeriodId: string,
  datapointId: string,
  value: string | null,
  expectedUpdatedAt?: string | null,
  overwrite?: boolean,
): Promise<EditorMutationResult> {
  return saveVs2026EditorScalar({
    request: await currentRequest(),
    reportingPeriodId,
    datapointId,
    value,
    expectedUpdatedAt,
    overwrite,
    db: prisma,
  });
}

export async function saveOmissionClaimAction(
  reportingPeriodId: string,
  omittedDatapointId: string,
  reason: string,
  conditionsAssessed: boolean,
  reassessedForPeriod: boolean,
  rowId: string | null,
): Promise<EditorMutationResult> {
  return saveOmissionClaim({
    request: await currentRequest(),
    reportingPeriodId,
    omittedDatapointId,
    reason,
    conditionsAssessed,
    reassessedForPeriod,
    rowId,
    db: prisma,
  });
}
