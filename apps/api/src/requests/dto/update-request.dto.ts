import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequestStatus } from '@relayops/contracts';

export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  contactId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
