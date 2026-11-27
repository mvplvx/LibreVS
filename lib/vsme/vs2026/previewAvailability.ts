/**
 * Server-side gate for the VS 2026 diagnostic preview.
 * Disabled unless the process environment sets the exact value "true".
 */
export function isVS2026PreviewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VS2026_PREVIEW_ENABLED === "true";
}
