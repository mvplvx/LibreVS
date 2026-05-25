"use client";

import { useCallback, useEffect, useRef } from "react";

type NarrativeTextareaProps = {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function NarrativeTextarea({
  id,
  value,
  disabled = false,
  onChange,
  onBlur,
}: NarrativeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(96, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      disabled={disabled}
      rows={4}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onInput={resize}
      className="min-h-[6rem] w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap disabled:bg-slate-50 disabled:text-slate-500"
    />
  );
}
