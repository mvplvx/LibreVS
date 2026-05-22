/**
 * Local/dev-safe structured logs (stdout JSON). No external analytics.
 * Set LIBREVS_LOG=0 to disable.
 */
export type LibreVsLogEvent =
  | "export.attempted"
  | "export.success"
  | "export.failure"
  | "export.validation_blocked"
  | "export.readiness_blocked"
  | "field.save.error"
  | "feedback.received";

export function librevsLog(
  event: LibreVsLogEvent,
  payload: Record<string, unknown> = {}
): void {
  if (process.env.LIBREVS_LOG === "0") {
    return;
  }
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...payload,
  });
  console.log(line);
}
