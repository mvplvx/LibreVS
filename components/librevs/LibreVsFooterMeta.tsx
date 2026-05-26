"use client";

import { useEffect, useState } from "react";
import { formatLibreVsVersionLine } from "@/lib/constants/librevsRelease";
import { LIBREVS_SCHEMA_VERSION, LIBREVS_TAGLINE } from "@/lib/constants/librevsCommunity";

type VersionApi = {
  version: string;
  releaseCandidate: string;
  schemaVersion: string;
  gitCommitShort: string | null;
};

export function LibreVsFooterMeta() {
  const [line, setLine] = useState(() =>
    formatLibreVsVersionLine()
  );

  useEffect(() => {
    void fetch("/api/librevs/version")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: VersionApi }) => {
        if (body.success && body.data) {
          setLine(
            formatLibreVsVersionLine({
              version: body.data.version,
              releaseCandidate: body.data.releaseCandidate,
              edition: "Community Edition",
              schemaVersion: body.data.schemaVersion,
              license: "MIT",
              gitCommitShort: body.data.gitCommitShort,
              environment: "production",
            })
          );
        }
      })
      .catch(() => {
        /* keep static fallback */
      });
  }, []);

  return (
    <>
      <p className="font-medium text-slate-800">{LIBREVS_TAGLINE}</p>
      <p className="mt-2 text-slate-600">{line}</p>
      <p className="mt-1 text-slate-500">
        Schema VSME {LIBREVS_SCHEMA_VERSION} · no telemetry · local-first
      </p>
    </>
  );
}
