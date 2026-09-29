import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { InterventionCategory } from '@prisma/client';

export class CreateInterventionDto {
  @IsEnum(InterventionCategory)
  @IsNotEmpty()
  category: InterventionCategory;

  @IsString()
  @IsNotEmpty()
  noteText: string;
}
