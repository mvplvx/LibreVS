"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LIBREVS_CONTACT_EMAIL,
  LIBREVS_DISCUSSIONS_URL,
  LIBREVS_GITHUB_REPO,
  LIBREVS_ISSUES_URL,
  LIBREVS_PHILOSOPHY,
} from "@/lib/constants/librevsCommunity";
import {
  LIBREVS_EDITION,
  LIBREVS_LICENSE_NAME,
  LIBREVS_RELEASE_CANDIDATE,
} from "@/lib/constants/librevsRelease";
import { ExportDisclaimer } from "./ExportDisclaimer";

type VersionPayload = {
  version: string;
  releaseCandidate: string;
  schemaVersion: string;
  gitCommitShort: string | null;
  license: string;
};

type AboutLibreVsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutLibreVsDialog({ open, onClose }: AboutLibreVsDialogProps) {
  const [version, setVersion] = useState<VersionPayload | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    void fetch("/api/librevs/version")
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: VersionPayload }) => {
        if (body.success && body.data) {
          setVersion(body.data);
        }
      })
      .catch(() => {
        /* non-fatal */
      });
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-librevs-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="about-librevs-title" className="text-lg font-semibold text-slate-900">
              About LibreVS
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {LIBREVS_EDITION} · {LIBREVS_RELEASE_CANDIDATE}
              {version ? ` · v${version.version}` : ""}
              {version?.gitCommitShort ? ` · ${version.gitCommitShort}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{LIBREVS_PHILOSOPHY}</p>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li>
            <span className="font-medium">Scope:</span> EU VSME (EFRAG) reporting
            infrastructure only
          </li>
          <li>
            <span className="font-medium">Architecture:</span> Local-first,
            self-hosted PostgreSQL
          </li>
          <li>
            <span className="font-medium">Telemetry:</span> None — no usage
            analytics or tracking
          </li>
          <li>
            <span className="font-medium">License:</span> {version?.license ?? LIBREVS_LICENSE_NAME}
          </li>
          <li>
            <span className="font-medium">Schema:</span> VSME{" "}
            {version?.schemaVersion ?? "2.0.0"}
          </li>
        </ul>

        <ExportDisclaimer compact className="mt-4" />

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <a
              href={LIBREVS_GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-800 underline"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href={LIBREVS_DISCUSSIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-800 underline"
            >
              Discussions
            </a>
          </li>
          <li>
            <a
              href={LIBREVS_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-800 underline"
            >
              Issues
            </a>
          </li>
          <li>
            <a
              href={`mailto:${LIBREVS_CONTACT_EMAIL}`}
              className="font-medium text-slate-800 underline"
            >
              {LIBREVS_CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
