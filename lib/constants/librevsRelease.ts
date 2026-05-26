import { LIBREVS_SCHEMA_VERSION, LIBREVS_VERSION } from "./librevsCommunity";

/** Public release candidate label (RC1, RC2, …). */
export const LIBREVS_RELEASE_CANDIDATE = "RC1";

export const LIBREVS_EDITION = "Community Edition";

export const LIBREVS_LICENSE_NAME = "MIT";

export type LibreVsBuildInfo = {
  version: string;
  releaseCandidate: string;
  edition: string;
  schemaVersion: string;
  license: string;
  gitCommitShort: string | null;
  environment: string;
};

/** Server-safe build metadata (no secrets). */
export function getLibreVsBuildInfo(): LibreVsBuildInfo {
  const sha =
    process.env.LIBREVS_GIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_LIBREVS_GIT_SHA?.trim() ||
    null;

  return {
    version: LIBREVS_VERSION,
    releaseCandidate: LIBREVS_RELEASE_CANDIDATE,
    edition: LIBREVS_EDITION,
    schemaVersion: LIBREVS_SCHEMA_VERSION,
    license: LIBREVS_LICENSE_NAME,
    gitCommitShort: sha ? sha.slice(0, 7) : null,
    environment: process.env.NODE_ENV ?? "development",
  };
}

export function formatLibreVsVersionLine(info: LibreVsBuildInfo = getLibreVsBuildInfo()): string {
  const parts = [
    `LibreVS ${info.edition} — ${info.releaseCandidate}`,
    `v${info.version}`,
    `schema VSME ${info.schemaVersion}`,
  ];
  if (info.gitCommitShort) {
    parts.push(`build ${info.gitCommitShort}`);
  }
  return parts.join(" · ");
}
