import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL_HOST;

if (!connectionString) {
  throw new Error("DATABASE_URL_HOST is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@relayops.local" },
    update: {},
    create: {
      email: "admin@relayops.local",
      passwordHash: "dev-placeholder",
      role: Role.ADMIN,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
