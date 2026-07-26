import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Colegio Las Américas', description: 'Nombre de la organización' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'AME123456789', description: 'RFC de la organización' })
  @IsString()
  @IsOptional()
  rfc?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'URL del logo' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Estado activo de la organización' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Colegio Las Américas', description: 'Nombre de la organización' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'AME123456789', description: 'RFC de la organización' })
  @IsString()
  @IsOptional()
  rfc?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'URL del logo' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Estado activo de la organización' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class AssignSchoolDto {
  @ApiProperty({ example: 'uuid', description: 'ID del plantel a asignar' })
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;
}

export class CreateOrgAdminDto {
  @ApiProperty({ example: 'admin@org.com', description: 'Correo del administrador' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '5551234567', description: 'Teléfono' })
  @IsString()
  @IsOptional()
  phone?: string;
}
