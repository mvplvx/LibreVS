import Link from "next/link";

export default function RetiredExportReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Legacy export review is retired</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          JSON, Excel, and PDF reports are downloaded from a finalised VS 2026 snapshot. This page no longer
          generates a report.
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
