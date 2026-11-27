"use client";

import { useEffect, useRef, useState } from "react";

import { initialFieldSync, nextEpoch, reduceFieldSync, type FieldSync } from "@/lib/vsme/vs2026/autosave";
import type { EditorMutationResult } from "@/lib/vsme/vs2026/editorView";

const DEBOUNCE_MS = 700;

export function useFieldAutosave(input: {
  stored: string;
  updatedAt: string | null;
  enabled: boolean;
  save: (draft: string, expectedUpdatedAt: string | null, overwrite: boolean) => Promise<EditorMutationResult>;
}): {
  draft: string;
  status: FieldSync["status"];
  message: string | null;
  edit: (draft: string) => void;
  replaceStored: () => void;
} {
  const [state, setState] = useState(() => initialFieldSync(input.stored, input.updatedAt));
  const stateRef = useRef(state);
  const saveRef = useRef(input.save);
  useEffect(() => {
    stateRef.current = state;
    saveRef.current = input.save;
  }, [input.save, state]);
  const serverKey = `${input.stored}\u0000${input.updatedAt ?? ""}`;
  const [seenServer, setSeenServer] = useState(serverKey);
  if (seenServer !== serverKey && state.status === "saved" && state.pendingEpoch === null) {
    setSeenServer(serverKey);
    setState(initialFieldSync(input.stored, input.updatedAt));
  }

  useEffect(() => {
    if (!input.enabled || state.status !== "unsaved" || state.pendingEpoch !== null) {
      return;
    }
    const timer = setTimeout(() => {
      const current = stateRef.current;
      if (current.status !== "unsaved" || current.pendingEpoch !== null) {
        return;
      }
      const epoch = nextEpoch(current);
      const sent = current.draft;
      setState((latest) => reduceFieldSync(latest, { type: "begin", epoch }));
      void saveRef.current(sent, current.updatedAt, false).then((result) => {
        setState((latest) => {
          if (result.ok) {
            return reduceFieldSync(latest, {
              type: "success",
              epoch,
              stored: result.code === "CLEARED" ? "" : sent,
              updatedAt: result.updatedAt ?? null,
            });
          }
          if (result.code === "CONFLICT") {
            return reduceFieldSync(latest, { type: "conflict", epoch, message: result.message });
          }
          return reduceFieldSync(latest, { type: "failure", epoch, message: result.message });
        });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input.enabled, state.draft, state.pendingEpoch, state.status]);

  useEffect(() => {
    if (state.status === "saved") {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.status]);

  return {
    draft: state.draft,
    status: state.status,
    message: state.message,
    edit: (draft) => setState((latest) => reduceFieldSync(latest, { type: "edit", draft })),
    replaceStored: () => {
      const current = stateRef.current;
      const epoch = nextEpoch(current);
      const sent = current.draft;
      setState((latest) => reduceFieldSync({ ...latest, pendingEpoch: null }, { type: "begin", epoch }));
      void saveRef.current(sent, current.updatedAt, true).then((result) => {
        setState((latest) => {
          if (!result.ok) {
            return reduceFieldSync(latest, { type: "failure", epoch, message: result.message });
          }
          return reduceFieldSync(latest, {
            type: "success",
            epoch,
            stored: result.code === "CLEARED" ? "" : sent,
            updatedAt: result.updatedAt ?? null,
          });
        });
      });
    },
  };
}

export function statusLabel(status: FieldSync["status"]): string {
  switch (status) {
    case "saved":
      return "Saved";
    case "unsaved":
      return "Unsaved changes";
    case "saving":
      return "Saving…";
    case "failed":
      return "Save failed";
    case "conflict":
      return "Conflict detected";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
