import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsInt, Min, MinLength, ValidateIf, IsArray } from "class-validator";
import { PlanningModalidad, NivelEducativo, PlanningStatus, CampoFormativo, EjeArticulador } from "@prisma/client";

export class GeneratePlanningDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: "El contexto inicial debe tener al menos 5 caracteres" })
  @ValidateIf((o) => !o.modalidad)
  @MinLength(20, { message: "El contexto inicial debe tener al menos 20 caracteres cuando no se especifica la modalidad" })
  contextoInicial: string;

  @IsOptional()
  @IsEnum(PlanningModalidad)
  modalidad?: PlanningModalidad;

  @IsOptional()
  @IsEnum(CampoFormativo)
  campoFormativo?: CampoFormativo;

  @IsOptional()
  @IsString()
  contenidoId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EjeArticulador, { each: true })
  ejesArticuladores?: EjeArticulador[];

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsEnum(NivelEducativo)
  standaloneLevel?: NivelEducativo;
 
  @IsOptional()
  @IsInt()
  @Min(1)
  standaloneGradeOrder?: number;

  @IsOptional()
  @IsUUID()
  targetTeacherProfileId?: string;
}

export class UpdatePlanningDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  contenidos?: string;

  @IsOptional()
  @IsString()
  pda?: string;

  @IsOptional()
  @IsString()
  relevanciaSocial?: string;

  @IsOptional()
  @IsString()
  produccionSugerida?: string;

  @IsOptional()
  fases?: any;

  @IsOptional()
  recursos?: any;

  @IsOptional()
  @IsEnum(CampoFormativo)
  campoFormativo?: CampoFormativo;

  @IsOptional()
  @IsEnum(EjeArticulador, { each: true })
  ejesArticuladores?: EjeArticulador[];

  @IsOptional()
  @IsEnum(PlanningStatus)
  status?: PlanningStatus;
}
