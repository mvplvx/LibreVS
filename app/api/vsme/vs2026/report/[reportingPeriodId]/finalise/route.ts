import { prisma } from "@/lib/db/prisma";
import { finaliseVS2026Report } from "@/lib/vsme/vs2026/reportFinalise";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

export async function POST(
  req: Request,
  context: { params: Promise<{ reportingPeriodId: string }> },
) {
  const { reportingPeriodId } = await context.params;
  let confirmed = false;
  try {
    const body: unknown = await req.json();
    confirmed =
      typeof body === "object" &&
      body !== null &&
      "confirmed" in body &&
      body.confirmed === true;
  } catch {
    confirmed = false;
  }
  const result = await finaliseVS2026Report({
    request: req,
    reportingPeriodId,
    confirmed,
    db: prisma,
  });
  if (!result.ok) {
    return Response.json(
      { success: false, code: result.code, error: result.message },
      { status: statusFor(result.code), headers: NO_STORE },
    );
  }
  return Response.json(
    {
      success: true,
      snapshotId: result.snapshotId,
      revision: result.revision,
      contentHash: result.contentHash,
    },
    { status: 200, headers: NO_STORE },
  );
}

function statusFor(code: string): number {
  if (code === "UNAUTHENTICATED") {
    return 401;
  }
  if (code === "NOT_FOUND") {
    return 404;
  }
  if (code === "DATABASE_FAILURE") {
    return 503;
  }
  return 409;
}
