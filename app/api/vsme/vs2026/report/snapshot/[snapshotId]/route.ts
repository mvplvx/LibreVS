import { prisma } from "@/lib/db/prisma";
import {
  parseReportDownloadFormat,
  readFinalVS2026ReportDownload,
  reportDownloadHeaders,
} from "@/lib/vsme/vs2026/reportFinalise";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ snapshotId: string }> },
) {
  const { snapshotId } = await context.params;
  const format = parseReportDownloadFormat(new URL(req.url).searchParams.get("format"));
  if (!format) {
    return Response.json(
      { success: false, code: "UNSUPPORTED_FORMAT", error: "Use json, xlsx, or pdf." },
      { status: 400, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } },
    );
  }
  const result = await readFinalVS2026ReportDownload({
    request: req,
    snapshotId,
    db: prisma,
    format,
  });
  if (!result.ok) {
    const status =
      result.code === "UNAUTHENTICATED"
        ? 401
        : result.code === "NOT_FOUND"
          ? 404
          : result.code === "DATABASE_FAILURE"
            ? 503
            : result.code === "UNSUPPORTED_FORMAT"
              ? 400
              : result.code === "REPORT_TOO_LARGE"
                ? 413
                : 409;
    return Response.json(
      { success: false, code: result.code, error: result.message },
      { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } },
    );
  }
  const body = typeof result.body === "string" ? result.body : Buffer.from(result.body);
  return new Response(body, { status: 200, headers: reportDownloadHeaders(result.filename, result.contentType) });
}
