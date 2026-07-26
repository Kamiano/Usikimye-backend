import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { SurvivorStatus } from '@prisma/client';

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsEnum(UrgencyLevel)
  @IsNotEmpty()
  urgency!: UrgencyLevel;

  @IsString()
  @IsOptional()
  reportedBy?: string;

  @IsString()
  @IsOptional()
  county?: string;

  @IsString()
  @IsOptional()
  subCounty?: string;

  @IsString()
  @IsOptional()
  location?: string;

  // --- TRAUMA-INFORMED & REPORTER EXPANSIONS ---
  @IsString()
  @IsOptional()
  reportMethod?: string; // "ANONYMOUS" or "DIRECT_REPORTER"

  @IsString()
  @IsOptional()
  reporterName?: string;

  @IsString()
  @IsOptional()
  reporterPhone?: string;

  @IsString()
  @IsOptional()
  preferredContactChannel?: string; // "CALL", "WHATSAPP", "SMS"

  @IsEnum(SurvivorStatus)
  @IsOptional()
  survivorStatus?: SurvivorStatus;

  @IsString()
  @IsOptional()
  survivorIdentity?: string; // "Female Sex Worker", "Transman", "Transwoman", etc.

  @IsString()
  @IsOptional()
  survivorIdentityOther?: string;

  @IsString()
  @IsOptional()
  survivorName?: string; // Nickname or pseudonym

  @IsString()
  @IsOptional()
  survivorAge?: string;

  @IsString()
  @IsOptional()
  survivorAgeGroup?: string; // e.g., "18-24", "25-34"

  @IsString()
  @IsOptional()
  targetType?: string; // "INDIVIDUAL" or "GROUP"

  @IsString()
  @IsOptional()
  perpetrator?: string; // "Police/Authorities", "Client", etc.

  @IsBoolean()
  @IsOptional()
  immediateDanger?: boolean;

  @IsString()
  @IsOptional()
  safeCallbackWindow?: string;

  @IsString()
  @IsOptional()
  relationshipToSurvivor?: string;

  @IsString()
  @IsOptional()
  servicesAccessed?: string;
}