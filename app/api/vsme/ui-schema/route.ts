import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { VSME_UI_SCHEMA } from "@/lib/vsme/vsme.uiSchema";

export async function GET() {
  return withApiHandler(async () => {
    return apiSuccess(VSME_UI_SCHEMA);
  });
}
