import { retiredPeriodRoute } from "@/lib/vsme/retiredRoute";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return retiredPeriodRoute(req, context.params);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return retiredPeriodRoute(req, context.params);
}
