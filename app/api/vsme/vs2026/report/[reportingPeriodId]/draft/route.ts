import { prisma } from "@/lib/db/prisma";
import { buildVS2026DraftDownload, reportDownloadHeaders } from "@/lib/vsme/vs2026/reportFinalise";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ reportingPeriodId: string }> },
) {
  const { reportingPeriodId } = await context.params;
  const result = await buildVS2026DraftDownload({
    request: req,
    reportingPeriodId,
    db: prisma,
  });
  if (!result.ok) {
    const status = result.code === "UNAUTHENTICATED" ? 401 : result.code === "NOT_FOUND" ? 404 : result.code === "DATABASE_FAILURE" ? 503 : 409;
    return Response.json(
      { success: false, code: result.code, error: result.message },
      { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } },
    );
  }
  return new Response(result.body, { status: 200, headers: reportDownloadHeaders(result.filename) });
}
