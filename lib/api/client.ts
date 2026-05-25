import type { ApiResponse } from "./response";

export type { ApiResponse } from "./response";

/** Thrown when the API envelope is unsuccessful or malformed. */
export class ApiClientError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError(
      `Invalid JSON response (HTTP ${res.status})`,
      res.status
    );
  }
}

function isApiEnvelope<T>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "success" in value && typeof (value as ApiResponse).success === "boolean";
}

/**
 * Parse `{ success, data, error? }` and return `data` or throw.
 * All frontend API access must go through this helper.
 */
export async function parseApiResponse<T>(res: Response): Promise<T> {
  const body = await parseJsonBody(res);

  if (!isApiEnvelope<T>(body)) {
    throw new ApiClientError(
      `Malformed API response (HTTP ${res.status})`,
      res.status
    );
  }

  if (!body.success) {
    throw new ApiClientError(body.error ?? "API error", res.status);
  }

  if (body.data === undefined) {
    throw new ApiClientError("API response missing data", res.status);
  }

  return body.data;
}

export async function apiGet<T>(
  url: string,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const res = await fetch(url, { ...init, method: "GET" });
  return parseApiResponse<T>(res);
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseApiResponse<T>(res);
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseApiResponse<T>(res);
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseApiResponse<T>(res);
}

export async function apiDelete<T>(
  url: string,
  init?: Omit<RequestInit, "method" | "body">
): Promise<T> {
  const res = await fetch(url, { ...init, method: "DELETE" });
  return parseApiResponse<T>(res);
}
