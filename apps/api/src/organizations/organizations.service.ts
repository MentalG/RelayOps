import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            contacts: true,
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
        serviceRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return organization;
  }

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.ensureExists(id);
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);

    const [contactCount, requestCount, jobCount] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId: id } }),
      this.prisma.serviceRequest.count({ where: { organizationId: id } }),
      this.prisma.job.count({ where: { organizationId: id } }),
    ]);

    if (contactCount > 0 || requestCount > 0 || jobCount > 0) {
      throw new ConflictException(
        'Cannot delete an organization that still has contacts, requests, or jobs',
      );
    }

    return this.prisma.organization.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
  }
}
