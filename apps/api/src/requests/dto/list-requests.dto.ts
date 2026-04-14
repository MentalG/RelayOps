import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RequestStatus } from '@relayops/contracts';

const REQUEST_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'status',
] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export class ListRequestsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsIn(REQUEST_SORT_FIELDS)
  sortBy?: (typeof REQUEST_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortDirection?: (typeof SORT_DIRECTIONS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
