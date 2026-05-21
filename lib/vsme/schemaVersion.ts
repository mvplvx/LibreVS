import { VSME_SCHEMA } from "./vsme.schema";

/** Canonical registry version stamped on new reporting periods (fully v2). */
export const VSME_SCHEMA_VERSION = VSME_SCHEMA.version;

export {
  VSME_SCHEMA_VERSION_LEGACY,
  VSME_SCHEMA_VERSION_CLEAN,
  resolveReportingPeriodSchemaVersion,
  periodHasLegacyData,
} from "./migration/schemaVersion";
