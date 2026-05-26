"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";

type SystemHealthPayload = {
  status: string;
  schemaVersion: string;
  registry: {
    fieldCount: number;
    bSections: number;
    cSections: number;
  };
  legacyFieldsDetected: boolean;
  warnings?: string[];
};

const TONE: Record<string, { dot: string; label: string }> = {
  ok: { dot: "bg-emerald-500", label: "System OK" },
  degraded: { dot: "bg-amber-500", label: "System warnings" },
  error: { dot: "bg-red-500", label: "System error" },
};

export function SystemHealthIndicator() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["librevs", "system-health"],
    queryFn: () => apiGet<SystemHealthPayload>("/api/system-health"),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const status = isError ? "error" : (data?.status ?? "degraded");
  const tone = TONE[status] ?? TONE.degraded;

  return (
    <a
      href="/system/health"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm hover:bg-slate-50"
      title={
        isLoading
          ? "Checking system health"
          : `${tone.label} · schema ${data?.schemaVersion ?? "—"} · ${data?.registry.fieldCount ?? "—"} fields`
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-slate-300" : tone.dot}`}
        aria-hidden
      />
      <span className="font-medium text-slate-700">
        {isLoading ? "Health…" : tone.label}
      </span>
      {data?.legacyFieldsDetected ? (
        <span className="text-amber-700">legacy rows</span>
      ) : null}
    </a>
  );
}
