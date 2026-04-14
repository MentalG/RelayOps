import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  RequestStatus,
  canTransitionJobStatus,
} from '@relayops/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

function hasOwnProperty<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        organization: true,
        contact: true,
        request: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        statusEvents: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  async create(dto: CreateJobDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureContactBelongsToOrganization(
      dto.organizationId,
      dto.contactId ?? null,
    );
    await this.ensureRequestBelongsToOrganization({
      organizationId: dto.organizationId,
      contactId: dto.contactId ?? null,
      requestId: dto.requestId ?? null,
    });

    return this.prisma.job.create({
      data: {
        organizationId: dto.organizationId,
        contactId: dto.contactId ?? null,
        requestId: dto.requestId ?? null,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? JobStatus.PLANNED,
      },
    });
  }

  async update(id: string, dto: UpdateJobDto, changedById: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        contactId: true,
        requestId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    const currentStatus = job.status as JobStatus;
    const nextOrganizationId = dto.organizationId ?? job.organizationId;
    const nextContactId = hasOwnProperty(dto, 'contactId')
      ? (dto.contactId ?? null)
      : job.contactId;
    const nextRequestId = hasOwnProperty(dto, 'requestId')
      ? (dto.requestId ?? null)
      : job.requestId;
    const nextStatus = dto.status ?? currentStatus;
    const statusChanged =
      dto.status !== undefined && dto.status !== currentStatus;

    await this.ensureOrganizationExists(nextOrganizationId);
    await this.ensureContactBelongsToOrganization(
      nextOrganizationId,
      nextContactId,
    );
    await this.ensureRequestBelongsToOrganization({
      organizationId: nextOrganizationId,
      contactId: nextContactId,
      requestId: nextRequestId,
    });

    if (dto.status && !canTransitionJobStatus(currentStatus, dto.status)) {
      throw new ConflictException(
        `Invalid job status transition from ${currentStatus} to ${dto.status}`,
      );
    }

    if (statusChanged) {
      return this.prisma.client.$transaction(async (tx) => {
        await tx.job.update({
          where: { id },
          data: {
            organizationId: nextOrganizationId,
            contactId: nextContactId,
            requestId: nextRequestId,
            title: dto.title,
            description: dto.description,
            status: nextStatus,
          },
        });

        await tx.jobStatusEvent.create({
          data: {
            jobId: id,
            fromStatus: currentStatus,
            toStatus: nextStatus,
            changedById,
          },
        });

        return tx.job.findUnique({
          where: { id },
          include: {
            organization: true,
            contact: true,
            request: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
            statusEvents: {
              orderBy: { changedAt: 'desc' },
              include: {
                changedBy: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        });
      });
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        organizationId: nextOrganizationId,
        contactId: nextContactId,
        requestId: nextRequestId,
        title: dto.title,
        description: dto.description,
        status: nextStatus,
      },
      include: {
        organization: true,
        contact: true,
        request: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        statusEvents: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    return this.prisma.job.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }
  }

  private async ensureContactBelongsToOrganization(
    organizationId: string,
    contactId: string | null,
  ) {
    if (!contactId) {
      return;
    }

    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    if (contact.organizationId !== organizationId) {
      throw new ConflictException(
        'Contact must belong to the same organization as the job',
      );
    }
  }

  private async ensureRequestBelongsToOrganization(params: {
    organizationId: string;
    contactId: string | null;
    requestId: string | null;
  }) {
    const { organizationId, contactId, requestId } = params;

    if (!requestId) {
      return;
    }

    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        organizationId: true,
        contactId: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    const requestStatus = request.status as RequestStatus;

    if (request.organizationId !== organizationId) {
      throw new ConflictException(
        'Request must belong to the same organization as the job',
      );
    }

    if (request.contactId && request.contactId !== contactId) {
      throw new ConflictException(
        'Job contact must match the linked request contact',
      );
    }

    if (requestStatus !== RequestStatus.CONVERTED) {
      throw new ConflictException(
        'Only converted requests can be linked to jobs',
      );
    }
  }
}
