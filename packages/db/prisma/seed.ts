import { PrismaPg } from "@prisma/adapter-pg";
import {
  JobStatus,
  PrismaClient,
  RequestStatus,
  Role,
} from "../generated/prisma/client.ts";
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

  const [adminUser, managerUser, operatorUser] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "admin@relayops.local" } }),
    prisma.user.findUniqueOrThrow({
      where: { email: "manager@relayops.local" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { email: "operator@relayops.local" },
    }),
  ]);

  await prisma.jobStatusEvent.deleteMany();
  await prisma.job.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.organization.deleteMany();

  const acme = await prisma.organization.create({
    data: {
      name: "Acme Manufacturing",
      industry: "Industrial Equipment",
      website: "https://acme.example.com",
      phone: "+1-312-555-0181",
      notes: "Regional manufacturer with a 24/7 maintenance contract.",
    },
  });

  const northwind = await prisma.organization.create({
    data: {
      name: "Northwind Facilities",
      industry: "Property Management",
      website: "https://northwind.example.com",
      phone: "+1-206-555-0147",
      notes: "Portfolio of mixed-use buildings across three metro areas.",
    },
  });

  const summit = await prisma.organization.create({
    data: {
      name: "Summit Retail Group",
      industry: "Retail",
      website: "https://summit.example.com",
      phone: "+1-415-555-0164",
      notes: "Rollout customer for store refresh and equipment upgrades.",
    },
  });

  const [sarah, miguel, dana, priya, leo] = await Promise.all([
    prisma.contact.create({
      data: {
        organizationId: acme.id,
        firstName: "Sarah",
        lastName: "Lopez",
        email: "sarah.lopez@acme.example.com",
        phone: "+1-312-555-0111",
        title: "Plant Operations Manager",
        notes: "Primary approver for emergency repair work.",
      },
    }),
    prisma.contact.create({
      data: {
        organizationId: acme.id,
        firstName: "Miguel",
        lastName: "Santos",
        email: "miguel.santos@acme.example.com",
        phone: "+1-312-555-0112",
        title: "Maintenance Supervisor",
      },
    }),
    prisma.contact.create({
      data: {
        organizationId: northwind.id,
        firstName: "Dana",
        lastName: "Kim",
        email: "dana.kim@northwind.example.com",
        phone: "+1-206-555-0121",
        title: "Facilities Director",
      },
    }),
    prisma.contact.create({
      data: {
        organizationId: summit.id,
        firstName: "Priya",
        lastName: "Shah",
        email: "priya.shah@summit.example.com",
        phone: "+1-415-555-0131",
        title: "Retail Programs Lead",
      },
    }),
    prisma.contact.create({
      data: {
        organizationId: summit.id,
        firstName: "Leo",
        lastName: "Martin",
        email: "leo.martin@summit.example.com",
        phone: "+1-415-555-0132",
        title: "Store Operations Manager",
      },
    }),
  ]);

  const conveyorRequest = await prisma.serviceRequest.create({
    data: {
      organizationId: acme.id,
      contactId: sarah.id,
      title: "Conveyor line belt replacement",
      description:
        "Line 3 is showing fraying and slippage during the second shift. Need inspection and replacement plan before the next production run.",
      status: RequestStatus.IN_REVIEW,
    },
  });

  const hvacRequest = await prisma.serviceRequest.create({
    data: {
      organizationId: northwind.id,
      contactId: dana.id,
      title: "Quarterly HVAC inspection",
      description:
        "Run scheduled maintenance across the Riverfront portfolio and flag units that need follow-up work before summer occupancy increases.",
      status: RequestStatus.APPROVED,
    },
  });

  const rolloutRequest = await prisma.serviceRequest.create({
    data: {
      organizationId: summit.id,
      contactId: priya.id,
      title: "POS terminal rollout support",
      description:
        "Coordinate technician coverage for the first wave of payment terminal replacements across ten stores.",
      status: RequestStatus.NEW,
    },
  });

  const lightingRequest = await prisma.serviceRequest.create({
    data: {
      organizationId: summit.id,
      contactId: leo.id,
      title: "Warehouse lighting retrofit",
      description:
        "Replace failing fixtures in the west warehouse and rebalance circuit loads before the next inventory count.",
      status: RequestStatus.CONVERTED,
    },
  });

  const lightingJob = await prisma.job.create({
    data: {
      organizationId: summit.id,
      contactId: leo.id,
      requestId: lightingRequest.id,
      title: "Warehouse lighting retrofit",
      description:
        "Field execution for the approved warehouse lighting retrofit, including fixture replacement and post-work testing.",
      status: JobStatus.SCHEDULED,
    },
  });

  const boilerJob = await prisma.job.create({
    data: {
      organizationId: northwind.id,
      contactId: dana.id,
      title: "Boiler room preventive maintenance",
      description:
        "Perform maintenance and safety checks on the main boiler room for the Harbor Tower property.",
      status: JobStatus.IN_PROGRESS,
    },
  });

  const calibrationJob = await prisma.job.create({
    data: {
      organizationId: acme.id,
      contactId: miguel.id,
      title: "Packaging line sensor calibration",
      description:
        "Calibrate proximity sensors and verify line tolerances before the new packaging run starts on Friday.",
      status: JobStatus.PLANNED,
    },
  });

  await prisma.jobStatusEvent.createMany({
    data: [
      {
        jobId: lightingJob.id,
        fromStatus: JobStatus.PLANNED,
        toStatus: JobStatus.SCHEDULED,
        changedById: managerUser.id,
      },
      {
        jobId: boilerJob.id,
        fromStatus: JobStatus.PLANNED,
        toStatus: JobStatus.SCHEDULED,
        changedById: adminUser.id,
      },
      {
        jobId: boilerJob.id,
        fromStatus: JobStatus.SCHEDULED,
        toStatus: JobStatus.IN_PROGRESS,
        changedById: operatorUser.id,
      },
    ],
  });

  console.log(`Seeded organizations: ${[acme.name, northwind.name, summit.name].join(", ")}`);
  console.log(
    `Seeded service requests: ${[
      conveyorRequest.title,
      hvacRequest.title,
      rolloutRequest.title,
      lightingRequest.title,
    ].length}`,
  );
  console.log(
    `Seeded jobs: ${[
      lightingJob.title,
      boilerJob.title,
      calibrationJob.title,
    ].length}`,
  );
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
