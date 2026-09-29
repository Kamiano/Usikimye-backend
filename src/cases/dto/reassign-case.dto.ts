import { IsOptional, IsString } from 'class-validator';

export class ReassignCaseDto {
  @IsString()
  @IsOptional()
  assignedToId?: string | null;

  @IsString()
  @IsOptional()
  note?: string;
}
