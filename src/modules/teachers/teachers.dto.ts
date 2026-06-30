import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUUID,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTeacherDto {
  @ApiProperty({ example: "teacher@school.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123", minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "Jane" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: "+3541234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "f45787e3-aea7-41b8-bc18-e39dc35dcdf6" })
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional({ example: "EMP-001" })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiPropertyOptional({ example: "Mathematics" })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: "2026-06-14T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiPropertyOptional({ type: [String], example: ["grades", "attendance"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedModules?: string[];
}

export class UpdateTeacherDto {
  @ApiPropertyOptional({ example: "Jane" })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: "+3541234567" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: "EMP-001" })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiPropertyOptional({ example: "Mathematics" })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: "2026-06-14T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiPropertyOptional({ type: [String], example: ["grades", "attendance"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedModules?: string[];
}
