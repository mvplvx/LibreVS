"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LIBREVS_CONTACT_EMAIL,
  LIBREVS_DISCUSSIONS_URL,
  LIBREVS_GITHUB_REPO,
  LIBREVS_ISSUES_URL,
} from "@/lib/constants/librevsCommunity";
import { AboutLibreVsDialog } from "@/components/librevs/AboutLibreVsDialog";
import { LibreVsFooterMeta } from "@/components/librevs/LibreVsFooterMeta";

type LibreVsChromeProps = {
  children: React.ReactNode;
};

export function LibreVsChrome({ children }: LibreVsChromeProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                LibreVS
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Community Edition
              </span>
              <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                RC1
              </span>
            </Link>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <Link href="/vsme" className="hover:text-slate-900">
              VSME entry
            </Link>
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/system/health" className="hover:text-slate-900">
              System
            </Link>
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="hover:text-slate-900"
            >
              About
            </button>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-auto border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-600">
          <LibreVsFooterMeta />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <a
                href={LIBREVS_GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href={LIBREVS_DISCUSSIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                Suggest a feature
              </a>
            </li>
            <li>
              <a
                href={LIBREVS_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                Report a bug
              </a>
            </li>
            <li>
              <a
                href={`mailto:${LIBREVS_CONTACT_EMAIL}`}
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                {LIBREVS_CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                About
              </button>
            </li>
          </ul>
        </div>
      </footer>

      <AboutLibreVsDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
