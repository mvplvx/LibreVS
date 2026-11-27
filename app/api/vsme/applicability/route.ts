import { retiredReportingResponse } from "@/lib/vsme/retiredRoute";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return retiredReportingResponse(req);
}
