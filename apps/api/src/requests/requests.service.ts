import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  RequestStatus,
  canTransitionRequestStatus,
} from '@relayops/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { ListRequestsDto } from './dto/list-requests.dto.js';
import { UpdateRequestDto } from './dto/update-request.dto.js';

function hasOwnProperty<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListRequestsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();
    const sortBy = query.sortBy ?? 'updatedAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ServiceRequestWhereInput = {
      status: query.status,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              organization: {
                is: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
            {
              contact: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ]
        : undefined,
    };

    const orderBy: Prisma.ServiceRequestOrderByWithRelationInput = {
      [sortBy]: sortDirection,
    };

    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
          job: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        contact: true,
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { action: 'request.converted_to_job' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const auditEvents = auditLogs.filter((event) => {
      const metadata = event.metadata as
        | { requestId?: string }
        | null
        | undefined;
      return metadata?.requestId === id;
    });

    return {
      ...request,
      auditEvents,
    };
  }

  async create(dto: CreateRequestDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureContactBelongsToOrganization(
      dto.organizationId,
      dto.contactId ?? null,
    );

    return this.prisma.serviceRequest.create({
      data: {
        organizationId: dto.organizationId,
        contactId: dto.contactId ?? null,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? RequestStatus.NEW,
      },
    });
  }

  async update(id: string, dto: UpdateRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    const currentStatus = request.status as RequestStatus;
    const nextOrganizationId = dto.organizationId ?? request.organizationId;
    const nextContactId = hasOwnProperty(dto, 'contactId')
      ? (dto.contactId ?? null)
      : request.contactId;

    await this.ensureOrganizationExists(nextOrganizationId);
    await this.ensureContactBelongsToOrganization(
      nextOrganizationId,
      nextContactId,
    );

    if (
      request.job &&
      ((dto.organizationId && dto.organizationId !== request.organizationId) ||
        (hasOwnProperty(dto, 'contactId') &&
          nextContactId !== request.contactId))
    ) {
      throw new ConflictException(
        'Cannot change request organization or contact after a job has been linked',
      );
    }

    if (dto.status && !canTransitionRequestStatus(currentStatus, dto.status)) {
      throw new ConflictException(
        `Invalid request status transition from ${currentStatus} to ${dto.status}`,
      );
    }

    return this.prisma.serviceRequest.update({
      where: { id },
      data: {
        organizationId: nextOrganizationId,
        contactId: nextContactId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
      },
    });
  }

  async delete(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }

    if (request.job) {
      throw new ConflictException(
        'Cannot delete a request that has already been linked to a job',
      );
    }

    return this.prisma.serviceRequest.delete({ where: { id } });
  }

  async convert(id: string, userId: string, userRole: string) {
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: { id },
        include: {
          job: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!request) {
        throw new NotFoundException(`Request ${id} not found`);
      }

      const currentStatus = request.status as RequestStatus;

      if (request.job) {
        throw new ConflictException(
          'Request has already been converted to a job',
        );
      }

      if (currentStatus !== RequestStatus.APPROVED) {
        throw new ConflictException(
          `Only approved requests can be converted. Current status is ${currentStatus}`,
        );
      }

      const job = await tx.job.create({
        data: {
          organizationId: request.organizationId,
          contactId: request.contactId,
          requestId: request.id,
          title: request.title,
          description: request.description,
          status: JobStatus.PLANNED,
        },
      });

      const updatedRequest = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: RequestStatus.CONVERTED,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'request.converted_to_job',
          userId,
          metadata: {
            requestId: request.id,
            jobId: job.id,
            previousStatus: currentStatus,
            nextStatus: RequestStatus.CONVERTED,
            requestTitle: request.title,
            createdJobStatus: JobStatus.PLANNED,
            actorRole: userRole,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        request: updatedRequest,
        job,
      };
    });
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
        'Contact must belong to the same organization as the request',
      );
    }
  }
}
