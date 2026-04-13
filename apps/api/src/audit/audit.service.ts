import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        userId: userId,
        // Cast needed: our Record<string, unknown> is compatible at runtime
        // but Prisma's InputJsonValue type is narrower than unknown
        metadata: metadata as never,
      },
    });
  }
}
