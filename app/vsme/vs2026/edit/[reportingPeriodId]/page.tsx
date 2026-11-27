import { headers } from "next/headers";

import { EditorRefresh } from "@/components/vsme/vs2026/EditorRefresh";
import { prisma } from "@/lib/db/prisma";
import { loadVs2026Editor, type EditorLoadResult } from "@/lib/vsme/vs2026/editorLoad";
import { loadVS2026ReportPanel } from "@/lib/vsme/vs2026/reportFinalise";
import { getVS2026ReportingState } from "@/lib/vsme/vs2026/reportingState";

export const dynamic = "force-dynamic";

export default async function Vs2026EditorPage({
  params,
}: {
  params: Promise<{ reportingPeriodId: string }>;
}) {
  const { reportingPeriodId } = await params;
  const requestHeaders = await headers();
  const request = new Request("http://localhost/vsme/vs2026/edit", { headers: requestHeaders });
  const result = await loadVs2026Editor({
    reportingPeriodId,
    request,
    db: prisma,
  });
  const reportingState =
    result.status === "READY"
      ? await getVS2026ReportingState({ reportingPeriodId, request, db: prisma })
      : null;
  const reportPanel =
    result.status === "READY"
      ? await loadVS2026ReportPanel({ reportingPeriodId, request, db: prisma })
      : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {result.status === "READY" ? (
          <EditorRefresh view={result.view} reportingState={reportingState} reportPanel={reportPanel} />
        ) : (
          <EditorStatus result={result} />
        )}
      </div>
    </main>
  );
}

function EditorStatus({ result }: { result: Exclude<EditorLoadResult, { status: "READY" }> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">VS 2026 Basic Module</h1>
      <p className="mt-3 text-sm text-slate-700">{result.message}</p>
      {result.status === "OPTION_B" ? (
        <>
          <p className="mt-3 text-sm text-slate-700">
            {result.companyName ? `${result.companyName}, ` : ""}
            {result.year ?? "Year not set"}
          </p>
          <p className="mt-3 text-sm">
            <a className="text-slate-900 underline" href={result.previewHref}>
              Open the diagnostic preview for this period.
            </a>
          </p>
        </>
      ) : null}
    </section>
  );
}
