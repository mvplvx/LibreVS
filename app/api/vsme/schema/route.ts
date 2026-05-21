import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import {
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  VSME_FIELD_COUNT,
  VSME_FIELD_PATH_MAP,
} from "@/lib/vsme/vsme.fieldRegistry";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import { VSME_SCHEMA } from "@/lib/vsme/vsme.schema";

export async function GET() {
  return withApiHandler(async () => {
    return apiSuccess({
      schemaVersion: VSME_SCHEMA_VERSION,
      templateVersion: VSME_SCHEMA.templateVersion,
      schema: VSME_SCHEMA,
      fieldCount: VSME_FIELD_COUNT,
      bFieldCount: VSME_B_FIELD_COUNT,
      cFieldCount: VSME_C_FIELD_COUNT,
      fieldPathMap: VSME_FIELD_PATH_MAP,
    });
  });
}
