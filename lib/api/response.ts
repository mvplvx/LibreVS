export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiResponse<T>, {
    status,
  });
}

export function apiError(error: string, status: number): Response {
  return Response.json({ success: false, error } satisfies ApiResponse, {
    status,
  });
}

import type { ZodError } from "zod";

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path =
        issue.path.length > 0
          ? `${issue.path.map(String).join(".")}: `
          : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}
