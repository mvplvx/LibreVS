import type {
  ApiEnvelope,
  HealthCheckResult,
  SystemHealthData,
} from "./types.js";

function healthUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  return `${normalized}/api/system-health`;
}

export async function fetchSystemHealth(
  baseUrl: string,
  signal?: AbortSignal
): Promise<HealthCheckResult> {
  const url = healthUrl(baseUrl);
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    const body = (await res.json()) as ApiEnvelope<SystemHealthData>;
    const ready =
      res.ok &&
      body.success === true &&
      body.data?.status === "ok" &&
      body.data.databaseReachable === true;

    return {
      reachable: res.ok && body.success === true,
      ready,
      data: body.data,
      httpStatus: res.status,
      error: body.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return {
      reachable: false,
      ready: false,
      error: message,
    };
  }
}

export function isDatabaseReady(health: HealthCheckResult): boolean {
  return health.reachable && health.data?.databaseReachable === true;
}

export function isLibreVsReady(health: HealthCheckResult): boolean {
  return health.ready;
}

export async function waitForHealth(
  baseUrl: string,
  options: {
    timeoutMs: number;
    initialIntervalMs: number;
    maxIntervalMs: number;
    onPoll?: (health: HealthCheckResult) => void;
    shouldAbort?: () => boolean;
  }
): Promise<HealthCheckResult> {
  const started = Date.now();
  let interval = options.initialIntervalMs;

  while (Date.now() - started < options.timeoutMs) {
    if (options.shouldAbort?.()) {
      return { reachable: false, ready: false, error: "Aborted" };
    }

    const health = await fetchSystemHealth(baseUrl);
    options.onPoll?.(health);

    if (health.ready) {
      return health;
    }

    await sleep(interval);
    interval = Math.min(interval * 1.5, options.maxIntervalMs);
  }

  const last = await fetchSystemHealth(baseUrl);
  return {
    ...last,
    ready: false,
    error: last.error ?? "LibreVS is taking longer than expected to start.",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchVersion(baseUrl: string): Promise<string | null> {
  const normalized = baseUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${normalized}/api/librevs/version`, {
      headers: { Accept: "application/json" },
    });
    const body = (await res.json()) as ApiEnvelope<{ version?: string }>;
    if (body.success && body.data?.version) {
      return body.data.version;
    }
  } catch {
    /* ignore */
  }
  return null;
}
