import Link from "next/link";
import {
  LIBREVS_DISCUSSIONS_URL,
  LIBREVS_GITHUB_REPO,
  LIBREVS_ISSUES_URL,
  LIBREVS_PHILOSOPHY,
} from "@/lib/constants/librevsCommunity";
import { LIBREVS_RELEASE_CANDIDATE } from "@/lib/constants/librevsRelease";
const CHARACTERISTICS = [
  {
    title: "VS 2026",
    description: "Basic Module reporting for Option A",
  },
  {
    title: "Open-source",
    description: "Transparent and self-hostable",
  },
  {
    title: "Deterministic",
    description: "No AI-generated reporting logic",
  },
  {
    title: "Report downloads",
    description: "JSON, Excel, and PDF from a finalised snapshot",
  },
] as const;

const ENTRY_CARDS = [
  {
    title: "VS 2026 reporting",
    description: "Create a reporting period, choose Option A, and open the Basic Module editor.",
    cta: "Open the dashboard",
    href: "/dashboard",
  },
  {
    title: "System",
    description: "Read-only health and backup guidance for this self-hosted installation.",
    cta: "Open system health",
    href: "/system/health",
  },
] as const;

const STRUCTURE_ITEMS = [
  { label: "Reporting standard", value: "VS 2026" },
  { label: "Basic Module", value: "B1–B11" },
  { label: "Comprehensive Module", value: "Later" },
] as const;

export function HomeLanding() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 lg:py-20">
        {/* Hero */}
        <header className="border-b border-slate-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open-source VS 2026 reporting · {LIBREVS_RELEASE_CANDIDATE}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Structured sustainability reporting for European SMEs
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            LibreVS is a self-hosted workspace for VS 2026 Basic Module reporting,
            with review, finalisation, and JSON, Excel, and PDF downloads.
          </p>
        </header>

        {/* Characteristics */}
        <section
          className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="System characteristics"
        >
          {CHARACTERISTICS.map((item) => (
            <div key={item.title} className="bg-slate-50 px-4 py-4 sm:px-5">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        {/* Entry cards */}
        <section className="mt-12" aria-labelledby="entry-heading">
          <h2 id="entry-heading" className="sr-only">
            Application entry points
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ENTRY_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 hover:bg-slate-50/80"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>
                <span className="mt-4 text-sm font-medium text-slate-800 group-hover:text-slate-900">
                  {card.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Structure preview */}
        <section
          className="mt-12 rounded-lg border border-slate-200 bg-white px-5 py-5 sm:px-6"
          aria-labelledby="structure-heading"
        >
          <h2
            id="structure-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Reporting scope
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {STRUCTURE_ITEMS.map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-slate-500">{item.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Option A is the supported module. Comprehensive disclosures are not included yet.
          </p>
        </section>

        {/* Philosophy */}
        <section
          className="mt-12 border-t border-slate-200 pt-10"
          aria-labelledby="philosophy-heading"
        >
          <h2 id="philosophy-heading" className="sr-only">
            Project philosophy
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            {LIBREVS_PHILOSOPHY}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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
              <span className="text-slate-500">AGPLv3 license · no telemetry</span>
            </li>
            <li>
              <a
                href={LIBREVS_DISCUSSIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                GitHub Discussions
              </a>
              <span className="text-slate-500"> — feature suggestions</span>
            </li>
            <li>
              <a
                href={LIBREVS_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                GitHub Issues
              </a>
              <span className="text-slate-500"> — bug reports</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
