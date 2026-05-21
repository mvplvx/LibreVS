import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-semibold">LibreVS</h1>
        <p className="mt-2 text-slate-600">
          Open-source VSME (EFRAG) sustainability reporting — schema-driven, local-first.
        </p>
        <ul className="mt-8 space-y-3 text-sm">
          <li>
            <Link
              href="/vsme"
              className="font-medium text-slate-900 underline hover:no-underline"
            >
              VSME data entry
            </Link>
            <span className="text-slate-500"> — dynamic form from registry (264 fields)</span>
          </li>
          <li>
            <Link
              href="/dashboard"
              className="font-medium text-slate-900 underline hover:no-underline"
            >
              Reporting dashboard
            </Link>
            <span className="text-slate-500"> — coverage and export readiness</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
