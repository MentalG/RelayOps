import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { UpdateContactDto } from './dto/update-contact.dto.js';

function hasOwnProperty<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.contact.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
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
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  async create(dto: CreateContactDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    return this.prisma.contact.create({ data: dto });
  }

  async update(id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    const nextOrganizationId = dto.organizationId ?? contact.organizationId;

    await this.ensureOrganizationExists(nextOrganizationId);

    if (
      dto.organizationId &&
      dto.organizationId !== contact.organizationId &&
      (contact._count.serviceRequests > 0 || contact._count.jobs > 0)
    ) {
      throw new ConflictException(
        'Cannot move a contact to another organization while requests or jobs still reference it',
      );
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        organizationId: nextOrganizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: hasOwnProperty(dto, 'email') ? (dto.email ?? null) : undefined,
        phone: hasOwnProperty(dto, 'phone') ? (dto.phone ?? null) : undefined,
        title: hasOwnProperty(dto, 'title') ? (dto.title ?? null) : undefined,
        notes: hasOwnProperty(dto, 'notes') ? (dto.notes ?? null) : undefined,
      },
    });
  }

  async delete(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            serviceRequests: true,
            jobs: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    if (contact._count.serviceRequests > 0 || contact._count.jobs > 0) {
      throw new ConflictException(
        'Cannot delete a contact that is still linked to requests or jobs',
      );
    }

    return this.prisma.contact.delete({ where: { id } });
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
}
