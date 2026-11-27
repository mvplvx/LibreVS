import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/db/prisma";

export type AuthenticatedContext = {
  userId: string;
  organizationId: string;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign-in is required");
    this.name = "UnauthenticatedError";
  }
}

function readEnv(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  return value;
}

function authSecret(): string {
  const secret = readEnv("BETTER_AUTH_SECRET");
  if (secret.length >= 32) {
    return secret;
  }
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
}

function authBaseUrl(): string {
  const url = readEnv("BETTER_AUTH_URL");
  if (url === "") {
    throw new Error("BETTER_AUTH_URL is required");
  }
  return new URL(url).origin;
}

function trustedProxies(): string[] {
  return readEnv("LIBREVS_TRUSTED_PROXIES")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

const proxies = trustedProxies();

export const auth = betterAuth({
  secret: authSecret(),
  baseURL: authBaseUrl(),
  trustedOrigins: [authBaseUrl()],
  telemetry: { enabled: false },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: true,
        input: false,
      },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: false,
    },
    storeSessionInDatabase: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: "memory",
  },
  advanced: {
    disableCSRFCheck: false,
    disableOriginCheck: false,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    ipAddress: proxies.length > 0
      ? {
          ipAddressHeaders: ["x-forwarded-for"],
          trustedProxies: proxies,
        }
      : {
          // Do not read X-Forwarded-For unless a proxy is configured to replace it.
          // An empty header list keeps rate limiting on a shared bucket.
          ipAddressHeaders: new Array<string>(),
        },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const organizationId = typeof user.organizationId === "string"
            ? user.organizationId.trim()
            : "";
          if (organizationId === "") {
            throw new Error("Organisation membership is required");
          }
          const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true },
          });
          if (!organization) {
            throw new Error("Organisation was not found");
          }
          return {
            data: {
              ...user,
              organizationId,
              active: user.active !== false,
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

/**
 * Session cookie, then the domain user row.
 * Request headers never select the user or the organisation.
 */
export async function requireAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedContext | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, active: true },
  });
  if (!user || !user.active || user.organizationId.trim() === "") {
    return null;
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
  };
}

export async function requireApiContext(request: Request): Promise<AuthenticatedContext> {
  const context = await requireAuthenticatedUser(request);
  if (!context) {
    throw new UnauthenticatedError();
  }
  return context;
}
