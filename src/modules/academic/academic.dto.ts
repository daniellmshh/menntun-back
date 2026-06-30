import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { NivelEducativo } from "@prisma/client";


// ─── SCHOOL YEAR DTOs ──────────────────────────────────────────────

export class CreatePeriodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class CreateSchoolYearDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePeriodDto)
  periods?: CreatePeriodDto[];
}

export class UpdateSchoolYearDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdatePeriodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}

// ─── GRADES DTOs ───────────────────────────────────────────────────

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsEnum(NivelEducativo)
  @IsOptional()
  level?: NivelEducativo;

  @IsString()
  @IsOptional()
  schoolId?: string;
}

export class UpdateGradeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;

  @IsEnum(NivelEducativo)
  @IsOptional()
  level?: NivelEducativo;
}

// ─── GROUPS DTOs ───────────────────────────────────────────────────

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  gradeId: string;

  @IsString()
  @IsNotEmpty()
  schoolYearId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxStudents?: number;

  @IsString()
  @IsOptional()
  schoolId?: string;
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  gradeId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxStudents?: number;
}

export class AssignGroupTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherProfileId: string;

  @IsBoolean()
  @IsOptional()
  isHomeroom?: boolean;
}

// ─── SUBJECTS DTOs ─────────────────────────────────────────────────

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSubjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignSubjectTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherProfileId: string;

  @IsString()
  @IsNotEmpty()
  groupId: string;
}
