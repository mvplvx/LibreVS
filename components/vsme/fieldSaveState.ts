export type FieldSaveState =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export type WorkspaceSaveStatus = {
  message: string;
  tone: "neutral" | "active" | "warning" | "error";
  savingCount: number;
  dirtyCount: number;
  errorCount: number;
  hasPendingWork: boolean;
};

export function deriveWorkspaceSaveStatus(
  saveStateByFieldId: Record<string, FieldSaveState>
): WorkspaceSaveStatus {
  let savingCount = 0;
  let dirtyCount = 0;
  let errorCount = 0;

  for (const state of Object.values(saveStateByFieldId)) {
    if (state === "saving") {
      savingCount += 1;
    } else if (state === "dirty") {
      dirtyCount += 1;
    } else if (state === "error") {
      errorCount += 1;
    }
  }

  const hasPendingWork = savingCount > 0 || dirtyCount > 0;

  if (savingCount > 0) {
    return {
      message: "Saving changes…",
      tone: "active",
      savingCount,
      dirtyCount,
      errorCount,
      hasPendingWork: true,
    };
  }

  if (errorCount > 0) {
    return {
      message: `${errorCount} field${errorCount === 1 ? "" : "s"} failed to save`,
      tone: "error",
      savingCount,
      dirtyCount,
      errorCount,
      hasPendingWork: dirtyCount > 0,
    };
  }

  if (dirtyCount > 0) {
    return {
      message: "Unsaved changes pending",
      tone: "warning",
      savingCount,
      dirtyCount,
      errorCount,
      hasPendingWork: true,
    };
  }

  return {
    message: "All changes saved",
    tone: "neutral",
    savingCount: 0,
    dirtyCount: 0,
    errorCount: 0,
    hasPendingWork: false,
  };
}

export function fieldSaveBlocksUnload(
  saveStateByFieldId: Record<string, FieldSaveState>
): boolean {
  return Object.values(saveStateByFieldId).some(
    (s) => s === "dirty" || s === "saving"
  );
}
