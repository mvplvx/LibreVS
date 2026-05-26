import Link from "next/link";
import { SystemHealthPanel } from "@/components/system/SystemHealthPanel";

export default function SystemHealthPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">System health</h1>
          <p className="mt-1 text-sm text-slate-600">
            Read-only RC1 diagnostics for public testing — no data mutations
          </p>
          <nav className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-700 underline">
              Dashboard
            </Link>
            <Link href="/vsme" className="text-slate-700 underline">
              VSME workspace
            </Link>
            <Link href="/system/backup" className="text-slate-700 underline">
              Data safety
            </Link>
          </nav>
        </header>
        <SystemHealthPanel />
      </div>
    </main>
  );
}
