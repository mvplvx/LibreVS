import Link from "next/link";

export default function ReportingEntryPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">VS 2026 reporting</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          LibreVS reporting uses Commission Delegated Regulation (EU) 2026/1560. The former VSME data-entry
          workspace is retired. Create or open a reporting period from the dashboard, choose Option A, and continue
          in the Basic Module editor.
        </p>
        <p className="mt-4 text-sm">
          <Link className="font-medium text-slate-900 underline" href="/dashboard">
            Open the dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
