import type {
  ApiEnvelope,
  ErrorCategory,
  HealthCheckResult,
  SystemHealthData,
} from "./types.js";

function healthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/system-health`;
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

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (text.trimStart().startsWith("<")) {
        return {
          reachable: false,
          ready: false,
          httpStatus: res.status,
          error: "Server returned a web page instead of the health API.",
          category: "remote_unreachable",
        };
      }
      return {
        reachable: false,
        ready: false,
        httpStatus: res.status,
        error: "Unexpected health response format.",
        category: "remote_unreachable",
      };
    }

    let body: ApiEnvelope<SystemHealthData>;
    try {
      body = (await res.json()) as ApiEnvelope<SystemHealthData>;
    } catch {
      return {
        reachable: false,
        ready: false,
        httpStatus: res.status,
        error: "Invalid JSON from health endpoint.",
        category: "remote_unreachable",
      };
    }

    const ready =
      res.ok &&
      body.success === true &&
      body.data?.status === "ok" &&
      body.data.databaseReachable === true;

    let category: ErrorCategory | undefined;
    if (body.data && !body.data.databaseReachable) {
      category = "database_unavailable";
    } else if (body.data?.status === "degraded") {
      category = "migration_degraded";
    }

    return {
      reachable: res.ok && body.success === true,
      ready,
      data: body.data,
      httpStatus: res.status,
      error: body.error,
      category,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    const refused =
      /failed to fetch|networkerror|econnrefused|connection refused/i.test(
        message
      );
    return {
      reachable: false,
      ready: false,
      error: message,
      category: refused ? "remote_unreachable" : "health_timeout",
    };
  }
}

export function isDatabaseReady(health: HealthCheckResult): boolean {
  return health.reachable && health.data?.databaseReachable === true;
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
    category: last.category ?? "health_timeout",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchVersion(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/api/librevs/version`,
      { headers: { Accept: "application/json" } }
    );
    const body = (await res.json()) as ApiEnvelope<{ version?: string }>;
    if (body.success && body.data?.version) {
      return body.data.version;
    }
  } catch {
    /* ignore */
  }
  return null;
}
