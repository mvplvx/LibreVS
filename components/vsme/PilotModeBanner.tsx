"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";

type ReadinessPayload = {
  systemHealth: "green" | "yellow" | "red";
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  schemaVersion: string;
  registryVersion: string;
  exportIntegrity: boolean;
  pilotMode?: boolean;
};

const HEALTH_DOT: Record<ReadinessPayload["systemHealth"], string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

function isPilotModeClient(): boolean {
  return process.env.NEXT_PUBLIC_LIBREVS_PILOT_MODE !== "false";
}

export function PilotModeBanner() {
  if (!isPilotModeClient()) {
    return null;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["librevs", "release-readiness"],
    queryFn: () => apiGet<ReadinessPayload>("/api/vsme/release/readiness"),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const health = data?.systemHealth ?? "yellow";
  const score = data?.readinessScore;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">LibreVS Pilot Mode</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${HEALTH_DOT[health]}`}
            aria-hidden
          />
          <span className="capitalize">{health}</span>
        </span>
        {isLoading ? (
          <span className="text-slate-400">Checking readiness…</span>
        ) : isError ? (
          <span className="text-amber-700">Readiness unavailable</span>
        ) : score != null ? (
          <span>
            Readiness <span className="font-medium text-slate-800">{score}</span>
            /100
          </span>
        ) : null}
        {data?.exportIntegrity === false ? (
          <span className="text-amber-800">Export integrity check failed</span>
        ) : null}
      </div>
      <a
        href="/api/vsme/release/readiness"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-700 underline-offset-2 hover:underline"
      >
        Readiness JSON
      </a>
    </div>
  );
}
