import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/prisma/client.ts";
import * as bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL_HOST;

if (!connectionString) {
  throw new Error("DATABASE_URL_HOST is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo1234";
const SALT_ROUNDS = 10;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const users = [
    { email: "admin@relayops.local", role: Role.ADMIN },
    { email: "manager@relayops.local", role: Role.MANAGER },
    { email: "operator@relayops.local", role: Role.OPERATOR },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
    console.log(`Seeded ${user.role}: ${user.email}`);
  }
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
