import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobStatus } from '@relayops/contracts';

export class CreateJobDto {
  @IsString()
  @MinLength(1)
  organizationId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contactId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  requestId?: string | null;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
