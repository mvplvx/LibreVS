/**
 * Create one password account for an existing organisation.
 *
 * The password is read from a JSON file so it is not passed as a shell argument.
 * The file is not logged. Do not commit it.
 *
 *   npx tsx --env-file=.env scripts/provision-auth-user.ts ./auth-provision.local.json
 *
 * File shape:
 *   { "email": "...", "password": "...", "name": "...", "organizationId": "..." }
 * Recovery for an existing account in that organisation:
 *   { "email": "...", "password": "...", "organizationId": "...", "resetPassword": true }
 */
import { readFileSync } from "node:fs";

import { provisionCredentialUser, resetCredentialPassword } from "../lib/auth-provision";
import { prisma } from "../lib/db/prisma";

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath || process.argv.length !== 3) {
    console.error(
      "Usage: npx tsx --env-file=.env scripts/provision-auth-user.ts ./auth-provision.local.json",
    );
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    console.error("The provisioning file could not be read as JSON");
    process.exit(1);
  }

  if (parsed === null || typeof parsed !== "object") {
    console.error("The provisioning file must be a JSON object");
    process.exit(1);
  }

  const body = parsed as Record<string, unknown>;
  if (
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    typeof body.organizationId !== "string"
  ) {
    console.error("email, password, and organizationId are required");
    process.exit(1);
  }

  try {
    if (body.resetPassword === true) {
      const reset = await resetCredentialPassword({
        email: body.email,
        password: body.password,
        organizationId: body.organizationId,
      });
      console.log(`Reset the password and revoked sessions for ${reset.userId}`);
    } else {
      if (typeof body.name !== "string") {
        console.error("name is required when creating an account");
        process.exit(1);
      }
      const created = await provisionCredentialUser({
        email: body.email,
        password: body.password,
        name: body.name,
        organizationId: body.organizationId,
      });
      console.log(`Provisioned account ${created.userId} for ${body.email.trim().toLowerCase()}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed";
    console.error(message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
