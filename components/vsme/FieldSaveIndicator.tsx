"use client";

import type { FieldSaveState } from "./fieldSaveState";

type FieldSaveIndicatorProps = {
  state: FieldSaveState;
  onRetry?: () => void;
};

export function FieldSaveIndicator({ state, onRetry }: FieldSaveIndicatorProps) {
  if (state === "idle") {
    return null;
  }

  if (state === "dirty") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
          aria-hidden
        />
        Unsaved changes
      </p>
    );
  }

  if (state === "saving") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
        <span
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden
        />
        Saving…
      </p>
    );
  }

  if (state === "saved") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700">
        <span className="text-emerald-600" aria-hidden>
          ✓
        </span>
        Saved
      </p>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <p className="flex items-center gap-1.5 text-[11px] text-red-700">
        <span aria-hidden>⚠</span>
        Save failed
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-[11px] font-medium text-red-800 underline hover:text-red-900"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
