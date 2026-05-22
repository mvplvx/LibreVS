"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VsmeFieldValue, VsmeMateriality } from "@/components/vsme/types";
import {
  deriveWorkspaceSaveStatus,
  fieldSaveBlocksUnload,
  type FieldSaveState,
} from "@/components/vsme/fieldSaveState";
import { getFieldMaterialityState } from "@/components/vsme/fieldMaterialityState";
import { useSaveVsmeField } from "@/components/vsme/queries";
import { VSME_FIELD_REGISTRY } from "@/lib/vsme/vsme.fieldRegistry";
import { librevsLog } from "@/lib/observability/librevsLog";
import { validateFieldValue } from "@/lib/vsme/validateFieldValue";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const SAVE_RETRY_DELAY_MS = 800;
const SAVED_INDICATOR_MS = 4000;

type PersistedValue = { value: string; unit: string | null };

function valuesEqual(
  a: PersistedValue | undefined,
  value: string,
  unit: string | null
): boolean {
  if (!a) {
    return false;
  }
  return a.value === value && (a.unit ?? null) === (unit ?? null);
}

export function useVsmeFieldSaveCoordinator(options: {
  periodId: string;
  employeeCount: number;
  localValues: Record<string, VsmeFieldValue>;
  setLocalValues: React.Dispatch<
    React.SetStateAction<Record<string, VsmeFieldValue>>
  >;
  serverValues: Record<string, VsmeFieldValue>;
  serverValuesSynced: boolean;
  materialityByFieldId: Record<string, VsmeMateriality>;
  fieldsReadOnly: boolean;
}) {
  const {
    periodId,
    employeeCount,
    localValues,
    setLocalValues,
    serverValues,
    serverValuesSynced,
    materialityByFieldId,
    fieldsReadOnly,
  } = options;

  const saveFieldMutation = useSaveVsmeField();
  const [saveStateByFieldId, setSaveStateByFieldId] = useState<
    Record<string, FieldSaveState>
  >({});

  const persistedRef = useRef<Record<string, PersistedValue>>({});
  const debounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const savedFadeTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const pendingSaveRef = useRef<
    Record<string, { value: string; unit: string | null }>
  >({});
  const flushingRef = useRef<Set<string>>(new Set());

  const setFieldSaveState = useCallback(
    (fieldId: string, state: FieldSaveState) => {
      setSaveStateByFieldId((prev) => {
        if (prev[fieldId] === state) {
          return prev;
        }
        return { ...prev, [fieldId]: state };
      });
    },
    []
  );

  const scheduleSavedFade = useCallback(
    (fieldId: string) => {
      if (savedFadeTimersRef.current[fieldId]) {
        clearTimeout(savedFadeTimersRef.current[fieldId]);
      }
      savedFadeTimersRef.current[fieldId] = setTimeout(() => {
        setSaveStateByFieldId((prev) => {
          if (prev[fieldId] !== "saved") {
            return prev;
          }
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
        delete savedFadeTimersRef.current[fieldId];
      }, SAVED_INDICATOR_MS);
    },
    []
  );

  const clearDebounce = useCallback((fieldId: string) => {
    const timer = debounceTimersRef.current[fieldId];
    if (timer) {
      clearTimeout(timer);
      delete debounceTimersRef.current[fieldId];
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const id of Object.keys(debounceTimersRef.current)) {
      clearTimeout(debounceTimersRef.current[id]);
    }
    debounceTimersRef.current = {};
    for (const id of Object.keys(savedFadeTimersRef.current)) {
      clearTimeout(savedFadeTimersRef.current[id]);
    }
    savedFadeTimersRef.current = {};
  }, []);

  useEffect(() => {
    clearAllTimers();
    setSaveStateByFieldId({});
    persistedRef.current = {};
    pendingSaveRef.current = {};
    flushingRef.current.clear();
  }, [periodId, clearAllTimers]);

  useEffect(() => {
    if (!serverValuesSynced) {
      return;
    }
    const nextPersisted: Record<string, PersistedValue> = {};
    for (const [fieldId, entry] of Object.entries(serverValues)) {
      nextPersisted[fieldId] = {
        value: entry.value,
        unit: entry.unit,
      };
    }
    persistedRef.current = nextPersisted;

    setSaveStateByFieldId((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const fieldId of Object.keys(next)) {
        if (next[fieldId] === "dirty" || next[fieldId] === "saving") {
          continue;
        }
        if (next[fieldId] === "error") {
          continue;
        }
        delete next[fieldId];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [serverValues, serverValuesSynced]);

  const isMaterialField = useCallback(
    (fieldId: string) =>
      getFieldMaterialityState(fieldId, materialityByFieldId) === "MATERIAL",
    [materialityByFieldId]
  );

  const validateForSave = useCallback(
    (
      fieldId: string,
      value: string,
      unit: string | null
    ): { ok: true; normalizedValue: string } | { ok: false } => {
      const entry = VSME_FIELD_REGISTRY[fieldId];
      if (!entry) {
        return { ok: false };
      }
      const result = validateFieldValue(entry, value, unit);
      if (!result.ok) {
        return { ok: false };
      }
      return { ok: true, normalizedValue: result.normalizedValue };
    },
    []
  );

  const shouldPersist = useCallback(
    (fieldId: string, value: string, unit: string | null) => {
      if (!periodId || fieldsReadOnly || !isMaterialField(fieldId)) {
        return false;
      }
      const validation = validateForSave(fieldId, value, unit);
      if (!validation.ok) {
        return false;
      }
      if (
        valuesEqual(persistedRef.current[fieldId], validation.normalizedValue, unit)
      ) {
        return false;
      }
      return true;
    },
    [periodId, fieldsReadOnly, isMaterialField, validateForSave]
  );

  const runPersist = useCallback(
    async (fieldId: string, value: string, unit: string | null) => {
      if (!shouldPersist(fieldId, value, unit)) {
        return;
      }

      const validation = validateForSave(fieldId, value, unit);
      if (!validation.ok) {
        return;
      }

      setFieldSaveState(fieldId, "saving");

      const payload = {
        reportingPeriodId: periodId,
        fieldId,
        value: validation.normalizedValue,
        unit,
        employeeCount,
      };

      const attemptSave = () => saveFieldMutation.mutateAsync(payload);

      try {
        try {
          await attemptSave();
        } catch {
          await new Promise((r) => setTimeout(r, SAVE_RETRY_DELAY_MS));
          await attemptSave();
        }

        const normalized = validation.normalizedValue;
        persistedRef.current[fieldId] = { value: normalized, unit };
        setLocalValues((prev) => ({
          ...prev,
          [fieldId]: { value: normalized, unit },
        }));
        setFieldSaveState(fieldId, "saved");
        scheduleSavedFade(fieldId);
      } catch (err) {
        setFieldSaveState(fieldId, "error");
        librevsLog("field.save.error", {
          reportingPeriodId: periodId,
          fieldId,
          message: err instanceof Error ? err.message : "save failed",
        });
      }
    },
    [
      shouldPersist,
      validateForSave,
      periodId,
      employeeCount,
      saveFieldMutation,
      setFieldSaveState,
      scheduleSavedFade,
      setLocalValues,
    ]
  );

  const persistField = useCallback(
    async (fieldId: string, value: string, unit: string | null) => {
      pendingSaveRef.current[fieldId] = { value, unit };
      if (flushingRef.current.has(fieldId)) {
        return;
      }
      flushingRef.current.add(fieldId);
      try {
        while (pendingSaveRef.current[fieldId]) {
          const next = pendingSaveRef.current[fieldId];
          delete pendingSaveRef.current[fieldId];
          await runPersist(fieldId, next.value, next.unit);
        }
      } finally {
        flushingRef.current.delete(fieldId);
      }
    },
    [runPersist]
  );

  const scheduleAutosave = useCallback(
    (fieldId: string, value: string, unit: string | null) => {
      clearDebounce(fieldId);
      debounceTimersRef.current[fieldId] = setTimeout(() => {
        delete debounceTimersRef.current[fieldId];
        void persistField(fieldId, value, unit);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [clearDebounce, persistField]
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: string, unit: string | null) => {
      setLocalValues((prev) => ({
        ...prev,
        [fieldId]: { value, unit },
      }));

      if (fieldsReadOnly || !isMaterialField(fieldId)) {
        return;
      }

      if (valuesEqual(persistedRef.current[fieldId], value, unit)) {
        setSaveStateByFieldId((prev) => {
          if (prev[fieldId] === "error") {
            return prev;
          }
          if (!prev[fieldId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
        clearDebounce(fieldId);
        return;
      }

      setFieldSaveState(fieldId, "dirty");
      scheduleAutosave(fieldId, value, unit);
    },
    [
      setLocalValues,
      fieldsReadOnly,
      isMaterialField,
      setFieldSaveState,
      clearDebounce,
      scheduleAutosave,
    ]
  );

  const handleFieldSave = useCallback(
    (fieldId: string, value: string, unit: string | null) => {
      clearDebounce(fieldId);
      if (!shouldPersist(fieldId, value, unit)) {
        if (
          isMaterialField(fieldId) &&
          !valuesEqual(persistedRef.current[fieldId], value, unit)
        ) {
          setFieldSaveState(fieldId, "dirty");
        }
        return;
      }
      void persistField(fieldId, value, unit);
    },
    [
      clearDebounce,
      shouldPersist,
      isMaterialField,
      setFieldSaveState,
      persistField,
    ]
  );

  const retryFieldSave = useCallback(
    (fieldId: string) => {
      const entry = localValues[fieldId];
      if (!entry) {
        return;
      }
      clearDebounce(fieldId);
      void persistField(fieldId, entry.value, entry.unit);
    },
    [localValues, clearDebounce, persistField]
  );

  const workspaceSaveStatus = useMemo(
    () => deriveWorkspaceSaveStatus(saveStateByFieldId),
    [saveStateByFieldId]
  );

  useEffect(() => {
    const block = fieldSaveBlocksUnload(saveStateByFieldId);
    if (!block) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Some reporting data may not be saved.";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStateByFieldId]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  return {
    saveStateByFieldId,
    workspaceSaveStatus,
    handleFieldChange,
    handleFieldSave,
    retryFieldSave,
    saveFieldMutation,
  };
}
