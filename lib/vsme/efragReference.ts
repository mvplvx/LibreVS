import type { EfragReference, VsmeFieldDef, VsmeSectionDef } from "./vsme.types";

export type { EfragReference } from "./vsme.types";

/** Interactive EFRAG VSME standard (Annex I) — external regulatory context. */
export const EFRAG_VSME_INTERACTIVE_URL =
  "https://knowledgehub.efrag.org/eng/interactive/vsme/vsme-standard-annex-i/2025-07-30-ec-rec";

/** Read-only traceability metadata; not used in validation or export. */
export function resolveEfragReference(
  field: VsmeFieldDef,
  section: VsmeSectionDef
): EfragReference | undefined {
  if (field.efragReference) {
    return field.efragReference;
  }
  if (!field.efragParagraph?.trim()) {
    return undefined;
  }
  return {
    paragraph: field.efragParagraph.trim(),
    section: `${section.code} — ${section.title}`,
    url: EFRAG_VSME_INTERACTIVE_URL,
  };
}
