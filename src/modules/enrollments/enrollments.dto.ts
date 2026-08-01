import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, ValidateNested, IsArray, IsNumber, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { NivelEducativo, Gender, TipoSolicitud } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DatosPadreDto {
  @ApiProperty() @IsString() @IsNotEmpty() primerNombre: string;
  @ApiPropertyOptional() @IsString() @IsOptional() segundoNombre?: string;
  @ApiProperty() @IsString() @IsNotEmpty() primerApellido: string;
  @ApiProperty() @IsString() @IsNotEmpty() segundoApellido: string;
  
  // Legacy
  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;

  @ApiProperty() @IsString() @IsNotEmpty() email: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiProperty() @IsString() @IsNotEmpty() relationship: string;
  
  @ApiPropertyOptional() @IsString() @IsOptional() domicilio?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() identificacionUrl?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isPrimary?: boolean;
}

export class CreateSolicitudDto {
  @ApiPropertyOptional({ enum: TipoSolicitud })
  @IsEnum(TipoSolicitud)
  @IsOptional()
  tipoSolicitud?: TipoSolicitud;

  @ApiPropertyOptional() @IsString() @IsOptional() schoolYearId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() studentProfileId?: string;

  @ApiProperty() @IsString() @IsNotEmpty() primerNombre: string;
  @ApiPropertyOptional() @IsString() @IsOptional() segundoNombre?: string;
  @ApiProperty() @IsString() @IsNotEmpty() primerApellido: string;
  @ApiProperty() @IsString() @IsNotEmpty() segundoApellido: string;

  // Legacy fallback
  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;

  @ApiPropertyOptional() @IsDateString() @IsOptional() birthDate?: string;
  @ApiPropertyOptional({ enum: Gender }) @IsEnum(Gender) @IsOptional() gender?: Gender;
  
  @ApiPropertyOptional() @IsString() @IsOptional() curp?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() nacionalidad?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bloodType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() escuelaProcedencia?: string;

  @ApiPropertyOptional({ enum: NivelEducativo }) @IsEnum(NivelEducativo) @IsOptional() nivelEducativo?: NivelEducativo;
  @ApiProperty() @IsString() @IsNotEmpty() gradeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() groupId: string;

  @ApiPropertyOptional({ type: [DatosPadreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatosPadreDto)
  @IsOptional()
  padres?: DatosPadreDto[];
}

export class RejectSolicitudDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  motivoRechazo: string;
}

export class ChangeDocumentoStatusDto {
  @ApiProperty() @IsString() @IsNotEmpty() estado: string; // PENDIENTE, RECIBIDO, VALIDADO, RECHAZADO
  @ApiPropertyOptional() @IsString() @IsOptional() observaciones?: string;
}

export class CargoDto {
  @ApiProperty() @IsString() @IsNotEmpty() concepto: string;
  @ApiProperty() @IsNumber() @IsNotEmpty() monto: number;
  @ApiProperty() @IsDateString() @IsNotEmpty() fechaVencimiento: string;
}

export class AprobarSolicitudDto {
  @ApiPropertyOptional({ type: [CargoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CargoDto)
  @IsOptional()
  cargos?: CargoDto[];
}
