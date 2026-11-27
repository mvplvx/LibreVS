/**
 * Server-side gate for the VS 2026 Basic Module editor.
 * Disabled unless the process environment sets the exact value "true".
 * The diagnostic preview uses a separate flag.
 */
export function isVS2026EditorEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VS2026_EDITOR_ENABLED === "true";
}
