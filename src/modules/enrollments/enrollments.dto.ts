import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, ValidateNested, IsArray, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { NivelEducativo, Gender } from "@prisma/client";

export class DatosPadreDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class CreateSolicitudDto {
  @IsString()
  @IsOptional()
  schoolYearId?: string;

  @IsString()
  @IsOptional()
  studentProfileId?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(NivelEducativo)
  @IsOptional()
  nivelEducativo?: NivelEducativo;

  @IsString()
  @IsOptional()
  gradoPropuesto?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatosPadreDto)
  @IsOptional()
  padres?: DatosPadreDto[];
}

export class ChangeDocumentoStatusDto {
  @IsString()
  @IsNotEmpty()
  estado: string; // PENDIENTE, RECIBIDO, VALIDADO, RECHAZADO

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class CargoDto {
  @IsString()
  @IsNotEmpty()
  concepto: string;

  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @IsDateString()
  @IsNotEmpty()
  fechaVencimiento: string;
}

export class AprobarSolicitudDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  @IsOptional()
  cargos?: CargoDto[];
}
