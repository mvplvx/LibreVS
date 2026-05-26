"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LibreVS] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          LibreVS encountered an unexpected error in this view. Your reporting
          data in the database is unchanged. Try again or return to the workspace.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/vsme"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open workspace
          </Link>
          <Link
            href="/system/health"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            System health
          </Link>
        </div>
      </div>
    </main>
  );
}
