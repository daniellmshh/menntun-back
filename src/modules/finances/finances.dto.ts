import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsPositive, IsDecimal, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipoCargo, PagoMetodo } from '@prisma/client';

// ─── Catálogo de Cargos ────────────────────────────────

export class CreateCatalogoCargoDto {
  @ApiProperty() @IsString() nombre: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() monto: number;
  @ApiPropertyOptional({ enum: TipoCargo }) @IsOptional() @IsEnum(TipoCargo) tipo?: TipoCargo;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateCatalogoCargoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() monto?: number;
  @ApiPropertyOptional({ enum: TipoCargo }) @IsOptional() @IsEnum(TipoCargo) tipo?: TipoCargo;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}

// ─── Cargo ────────────────────────────────────────────

export class CreateCargoDto {
  @ApiProperty() @IsString() studentProfileId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() schoolYearId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() catalogoCargoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() solicitudInscripcionId?: string;
  @ApiProperty() @IsString() concepto: string;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() monto: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fechaVencimiento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notas?: string;
}

export class UpdateCargoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notas?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fechaVencimiento?: string;
}

// ─── Pago ────────────────────────────────────────────

export class CreatePagoDto {
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() monto: number;
  @ApiPropertyOptional({ enum: PagoMetodo }) @IsOptional() @IsEnum(PagoMetodo) metodo?: PagoMetodo;
  @ApiPropertyOptional() @IsOptional() @IsString() referencia?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notas?: string;
}

// ─── Tipos Documento Escuela ──────────────────────────

export class CreateTipoDocumentoDto {
  @ApiProperty() @IsString() nombre: string;
  @ApiProperty() @IsString() slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() obligatorio?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) orden?: number;
}

export class UpdateTipoDocumentoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nombre?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() obligatorio?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) orden?: number;
}
