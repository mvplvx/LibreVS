import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { getLibreVsBuildInfo } from "@/lib/constants/librevsRelease";

/** Public read-only version metadata (no secrets). */
export async function GET() {
  return withApiHandler(async () => {
    return apiSuccess(getLibreVsBuildInfo());
  });
}
