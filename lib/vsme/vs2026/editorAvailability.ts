/**
 * Server-side gate for creating and editing VS 2026 reports.
 * Disabled unless the process environment sets the exact value "true".
 * When it is off, the editor shows an unavailable state. It does not open another reporting workspace.
 * Finalised snapshot downloads do not use this flag.
 * The diagnostic preview uses its own flag.
 */
export function isVS2026EditorEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VS2026_EDITOR_ENABLED === "true";
}
