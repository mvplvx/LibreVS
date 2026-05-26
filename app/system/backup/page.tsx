import Link from "next/link";
import { DataOwnershipNotice } from "@/components/librevs/DataOwnershipNotice";
import { ExportDisclaimer } from "@/components/librevs/ExportDisclaimer";

export default function DataSafetyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">Data safety & backups</h1>
          <p className="mt-1 text-sm text-slate-600">
            Local-first reporting — you own your database
          </p>
          <nav className="mt-3 text-sm">
            <Link href="/system/health" className="text-slate-700 underline">
              ← System health
            </Link>
          </nav>
        </header>

        <DataOwnershipNotice />

        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Backup recommendation</h2>
          <p className="mt-2 leading-relaxed text-slate-600">
            Before upgrading LibreVS or applying Prisma migrations, take a full
            backup of your PostgreSQL database. LibreVS does not provide hosted
            backup services.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-slate-900 p-4 text-xs text-slate-100">
            {`# Example (adjust connection details)
pg_dump "$DATABASE_URL" -Fc -f librevs-backup-$(date +%Y%m%d).dump`}
          </pre>
          <p className="mt-4 leading-relaxed text-slate-600">
            Validated export artifacts (JSON, XLSX, PDF) complement database backups
            by preserving disclosure rows at a point in time. They do not replace
            materiality decisions or period metadata stored in the database.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 text-sm">
          <h2 className="font-semibold text-slate-900">Export your data</h2>
          <p className="mt-2 text-slate-600">
            When a reporting period is export-ready, use the dashboard or VSME
            workspace to generate deterministic XLSX and PDF files. JSON export is
            available via the API for integration workflows.
          </p>
          <Link
            href="/vsme/export-review"
            className="mt-3 inline-block font-medium text-slate-800 underline"
          >
            Open export review →
          </Link>
        </section>

        <ExportDisclaimer />
      </div>
    </main>
  );
}
