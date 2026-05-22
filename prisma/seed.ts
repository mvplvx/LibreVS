/**
 * Full local initialization: demo org/user + VSME demo company/period.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import {
  DEMO_ORGANIZATION_ID,
  seedVsmeDemo,
} from "../scripts/seed-vsme-demo";

const MOCK_USER_ID = "librevs-demo-user";

const prisma = new PrismaClient();

async function seedBase(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: DEMO_ORGANIZATION_ID },
    update: { name: "LibreVS Demo Organization" },
    create: {
      id: DEMO_ORGANIZATION_ID,
      name: "LibreVS Demo Organization",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@librevs.local" },
    update: {
      name: "Demo User",
      organizationId: organization.id,
    },
    create: {
      id: MOCK_USER_ID,
      email: "demo@librevs.local",
      name: "Demo User",
      organizationId: organization.id,
    },
  });

  await prisma.company.updateMany({
    where: { organizationId: null },
    data: { organizationId: organization.id },
  });

  console.log("Base seed: organization + demo user");
}

async function main(): Promise<void> {
  await seedBase();
  await seedVsmeDemo(prisma, { includeSampleData: true });
  console.log("db:seed complete — open http://localhost:3000/vsme");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
