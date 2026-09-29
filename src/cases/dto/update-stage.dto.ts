import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CaseStatus } from '@prisma/client';

export class UpdateStageDto {
  @IsEnum(CaseStatus)
  @IsNotEmpty()
  stage: CaseStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  resolutionSummary?: string;
}
