import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  EvaluationCalculationMode,
  EvaluationScoreStatus,
  EvaluationStatus,
} from "@prisma/client";

export class CreateEvaluationCategoryDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) @Max(100) @IsOptional() defaultWeight?: number;
  @IsNumber() @Min(0) @IsOptional() order?: number;
}

export class UpdateEvaluationCategoryDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) @Max(100) @IsOptional() defaultWeight?: number | null;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsNumber() @Min(0) @IsOptional() order?: number;
}

export class GradingPolicyWeightDto {
  @IsString() @IsNotEmpty() categoryId: string;
  @IsNumber() @Min(0) @Max(100) weight: number;
}

export class UpsertGradingPolicyDto {
  @IsString() @IsNotEmpty() groupId: string;
  @IsString() @IsNotEmpty() subjectId: string;
  @IsString() @IsNotEmpty() periodId: string;
  @IsEnum(EvaluationCalculationMode) @IsOptional() calculationMode?: EvaluationCalculationMode;
  @IsNumber() @Min(1) @Max(1000) @IsOptional() scaleMax?: number;
  @IsNumber() @Min(0) @Max(1000) @IsOptional() passingScore?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => GradingPolicyWeightDto) @IsOptional()
  weights?: GradingPolicyWeightDto[];
}

export class CreateEvaluationDto {
  @IsString() @IsNotEmpty() groupId: string;
  @IsString() @IsNotEmpty() subjectId: string;
  @IsString() @IsNotEmpty() periodId: string;
  @IsString() @IsNotEmpty() categoryId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() evaluationDate: string;
  @IsNumber() @Min(0.01) @Max(1000) maxScore: number;
  @IsEnum(EvaluationStatus) @IsOptional() status?: EvaluationStatus;
  @IsString() @IsOptional() teacherProfileId?: string;
}

export class UpdateEvaluationDto {
  @IsString() @IsOptional() categoryId?: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() @IsOptional() evaluationDate?: string;
  @IsNumber() @Min(0.01) @Max(1000) @IsOptional() maxScore?: number;
  @IsEnum(EvaluationStatus) @IsOptional() status?: EvaluationStatus;
}

export class EvaluationScoreInputDto {
  @IsString() @IsNotEmpty() studentProfileId: string;
  @IsNumber() @Min(0) @IsOptional() score?: number | null;
  @IsEnum(EvaluationScoreStatus) status: EvaluationScoreStatus;
  @IsString() @IsOptional() feedback?: string;
}

export class UpsertEvaluationScoresDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => EvaluationScoreInputDto)
  scores: EvaluationScoreInputDto[];
}
