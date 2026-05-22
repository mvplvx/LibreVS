import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api/response";

function isDatabaseUnavailable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P1001" || error.code === "P1002" || error.code === "P1017"))
  );
}

export async function withApiHandler(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return apiError(
        "Database is unavailable. Run migrations and seed, then retry.",
        503
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          return apiError("A record with this value already exists", 409);
        case "P2003":
          return apiError("Referenced record does not exist", 400);
        case "P2025":
          return apiError("Record not found", 404);
        default:
          return apiError(`Database error (${error.code})`, 400);
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return apiError("Invalid data for database operation", 400);
    }

    console.error(error);
    return apiError("Internal server error", 500);
  }
}

export async function parseJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function resolveRouteId(
  params: Promise<{ id: string }> | { id: string }
): Promise<string | null> {
  const resolved = await Promise.resolve(params);
  const id = resolved.id?.trim();
  return id || null;
}
