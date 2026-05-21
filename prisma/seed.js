const { PrismaClient } = require("@prisma/client");

const MOCK_ORGANIZATION_ID = "librevs-demo-org";
const MOCK_USER_ID = "librevs-demo-user";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: MOCK_ORGANIZATION_ID },
    update: { name: "LibreVS Demo Organization" },
    create: {
      id: MOCK_ORGANIZATION_ID,
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

  console.log("Seeded organization:", organization.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
