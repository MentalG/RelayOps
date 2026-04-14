import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@relayops/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { ListRequestsDto } from './dto/list-requests.dto.js';
import { UpdateRequestDto } from './dto/update-request.dto.js';
import { RequestsService } from './requests.service.js';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list(@Query() query: ListRequestsDto) {
    return this.requests.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.requests.getById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateRequestDto) {
    return this.requests.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateRequestDto) {
    return this.requests.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  delete(@Param('id') id: string) {
    return this.requests.delete(id);
  }

  @Post(':id/convert')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  convert(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.requests.convert(id, user.id, user.role);
  }
}
