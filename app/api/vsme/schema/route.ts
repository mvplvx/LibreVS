import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { VSME_FIELD_COUNT, VSME_FIELD_PATH_MAP } from "@/lib/vsme/vsme.fieldRegistry";
import { VSME_SCHEMA } from "@/lib/vsme/vsme.schema";

export async function GET() {
  return withApiHandler(async () => {
    return apiSuccess({
      schema: VSME_SCHEMA,
      fieldCount: VSME_FIELD_COUNT,
      fieldPathMap: VSME_FIELD_PATH_MAP,
    });
  });
}
