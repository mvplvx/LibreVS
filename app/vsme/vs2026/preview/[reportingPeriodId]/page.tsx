import { headers } from "next/headers";

import { RegulatoryPreview } from "@/components/vsme/vs2026/RegulatoryPreview";
import { prisma } from "@/lib/db/prisma";
import { getVS2026RegulatoryPreview } from "@/lib/vsme/vs2026/regulatoryPreview";

export const dynamic = "force-dynamic";

export default async function Vs2026PreviewPage({
  params,
}: {
  params: Promise<{ reportingPeriodId: string }>;
}) {
  const { reportingPeriodId } = await params;
  const requestHeaders = await headers();
  const result = await getVS2026RegulatoryPreview({
    reportingPeriodId,
    request: new Request("http://localhost/vsme/vs2026/preview", {
      headers: requestHeaders,
    }),
    db: prisma,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <RegulatoryPreview result={result} />
      </div>
    </main>
  );
}
