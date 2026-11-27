import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 12;

export async function provisionCredentialUser(input: {
  email: string;
  password: string;
  name: string;
  organizationId: string;
}): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const organizationId = input.organizationId.trim();
  if (email === "" || !email.includes("@")) {
    throw new Error("A valid email is required");
  }
  if (name === "") {
    throw new Error("A name is required");
  }
  if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > 128) {
    throw new Error("The password must be between 12 and 128 characters");
  }
  if (organizationId === "") {
    throw new Error("An organisation id is required");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });
  if (!organization) {
    throw new Error("Organisation was not found");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(input.password);
  const created = await context.internalAdapter.createUser({
    email,
    name,
    organizationId,
    active: true,
    emailVerified: true,
  }, { method: "email-password" });
  if (!created?.id) {
    throw new Error("The account could not be created");
  }

  try {
    await context.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: passwordHash,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: created.id } }).catch(() => undefined);
    throw error;
  }

  return { userId: created.id };
}

export async function resetCredentialPassword(input: {
  email: string;
  password: string;
  organizationId: string;
}): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  const organizationId = input.organizationId.trim();
  if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > 128) {
    throw new Error("The password must be between 12 and 128 characters");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true },
  });
  if (!user || user.organizationId !== organizationId) {
    throw new Error("Account was not found");
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(input.password);
  await context.internalAdapter.updatePassword(user.id, passwordHash);
  await prisma.session.deleteMany({ where: { userId: user.id } });
  return { userId: user.id };
}
