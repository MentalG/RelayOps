import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly db: InstanceType<typeof PrismaClient>;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL_HOST ?? '',
    });
    this.db = new PrismaClient({ adapter } as never);
  }

  get user() {
    return this.db.user;
  }

  get auditLog() {
    return this.db.auditLog;
  }

  async onModuleInit() {
    await this.db.$connect();
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
