import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "@prisma/client";

export class CreateStudentDto {
  @ApiProperty({ example: "student@school.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123", minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: "+123456789" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "f45787e3-aea7-41b8-bc18-e39dc35dcdf6" })
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional({ example: "STU-2026-001" })
  @IsString()
  @IsOptional()
  enrollmentNumber?: string;

  @ApiPropertyOptional({ example: "2010-05-15T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: "O+" })
  @IsString()
  @IsOptional()
  bloodType?: string;

  @ApiPropertyOptional({ example: "123 Main St, Reykjavik" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "g45787e3-aea7-41b8-bc18-e39dc35dcdf6" })
  @IsUUID()
  @IsOptional()
  groupId?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: "John" })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: "+123456789" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: "STU-2026-001" })
  @IsString()
  @IsOptional()
  enrollmentNumber?: string;

  @ApiPropertyOptional({ example: "2010-05-15T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: "O+" })
  @IsString()
  @IsOptional()
  bloodType?: string;

  @ApiPropertyOptional({ example: "123 Main St, Reykjavik" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "g45787e3-aea7-41b8-bc18-e39dc35dcdf6" })
  @IsUUID()
  @IsOptional()
  groupId?: string;
}
