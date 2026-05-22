import { createHash } from "crypto";
import { VSME_FIELD_IDS } from "./vsme.fieldRegistry";

/** Deterministic SHA-256 of canonical sorted v2 fieldIds (264-field registry). */
export function computeRegistryHash(): string {
  const payload = VSME_FIELD_IDS.slice().sort().join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
