/**
 * Controlled external pilot exposure — observability only, no business logic changes.
 */

export function isPilotModeEnabled(): boolean {
  if (process.env.LIBREVS_PILOT_MODE === "1") {
    return true;
  }
  if (process.env.LIBREVS_PILOT_MODE === "0") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_LIBREVS_PILOT_MODE === "true") {
    return true;
  }
  if (process.env.NEXT_PUBLIC_LIBREVS_PILOT_MODE === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

export function isReadinessEndpointExposed(): boolean {
  return isPilotModeEnabled();
}

/** Console-only pilot telemetry (never sent externally). */
export function pilotTelemetryLog(
  event: string,
  payload: Record<string, unknown> = {}
): void {
  if (!isPilotModeEnabled()) {
    return;
  }
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      pilot: true,
      event,
      ...payload,
    })
  );
}
