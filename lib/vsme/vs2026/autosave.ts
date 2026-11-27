export type SaveStatus = "saved" | "unsaved" | "saving" | "failed" | "conflict";

export type FieldSync = {
  draft: string;
  stored: string;
  updatedAt: string | null;
  status: SaveStatus;
  message: string | null;
  epoch: number;
  pendingEpoch: number | null;
};

export type FieldSyncEvent =
  | { type: "edit"; draft: string }
  | { type: "replace-stored"; stored: string; updatedAt: string | null }
  | { type: "begin"; epoch: number }
  | { type: "success"; epoch: number; stored: string; updatedAt: string | null }
  | { type: "failure"; epoch: number; message: string }
  | { type: "conflict"; epoch: number; message: string };

export function initialFieldSync(stored: string, updatedAt: string | null): FieldSync {
  return {
    draft: stored,
    stored,
    updatedAt,
    status: "saved",
    message: null,
    epoch: 0,
    pendingEpoch: null,
  };
}

/**
 * One field's autosave state.
 * A response is applied only when its epoch is the request still in flight.
 * An older response does not replace the draft or the stored version.
 */
export function reduceFieldSync(state: FieldSync, event: FieldSyncEvent): FieldSync {
  switch (event.type) {
    case "edit":
      return {
        ...state,
        draft: event.draft,
        status: event.draft === state.stored && state.pendingEpoch === null ? "saved" : state.pendingEpoch === null ? "unsaved" : state.status,
        message: state.pendingEpoch === null ? null : state.message,
      };
    case "replace-stored":
      return initialFieldSync(event.stored, event.updatedAt);
    case "begin":
      if (state.pendingEpoch !== null) {
        return state;
      }
      return { ...state, status: "saving", message: null, pendingEpoch: event.epoch, epoch: event.epoch };
    case "success":
      if (event.epoch !== state.pendingEpoch) {
        return state;
      }
      return {
        ...state,
        stored: event.stored,
        updatedAt: event.updatedAt,
        pendingEpoch: null,
        status: state.draft === event.stored ? "saved" : "unsaved",
        message: state.draft === event.stored ? "Saved" : null,
      };
    case "failure":
      if (event.epoch !== state.pendingEpoch) {
        return state;
      }
      return { ...state, pendingEpoch: null, status: "failed", message: event.message };
    case "conflict":
      if (event.epoch !== state.pendingEpoch) {
        return state;
      }
      return { ...state, pendingEpoch: null, status: "conflict", message: event.message };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function nextEpoch(state: FieldSync): number {
  return state.epoch + 1;
}
