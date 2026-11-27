import { NextResponse, type NextRequest } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/api/librevs/version", "/api/system-health", "/api/vsme/schema", "/api/vsme/applicability"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  return pathname.startsWith("/api/auth/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const context = await requireAuthenticatedUser(request);
  if (context) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
