import { retiredPeriodRoute } from "@/lib/vsme/retiredRoute";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; snapshotId: string }> },
) {
  const { id } = await context.params;
  return retiredPeriodRoute(req, { id });
}
