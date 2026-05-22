"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { EfragReference as EfragReferenceData } from "./types";

type EfragReferenceProps = {
  reference: EfragReferenceData;
  /** Optional field description from schema (read-only context). */
  explanation?: string;
};

function InfoIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-slate-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EfragReference({ reference, explanation }: EfragReferenceProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const trimmedExplanation = explanation?.trim();

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`EFRAG paragraph ${reference.paragraph} reference`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <InfoIcon />
        <span>EFRAG §{reference.paragraph}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="EFRAG reference"
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-left shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            EFRAG VSME
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {reference.section}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Paragraph <span className="font-mono">§{reference.paragraph}</span>
          </p>
          {trimmedExplanation ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {trimmedExplanation}
            </p>
          ) : null}
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            Open interactive EFRAG document
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
