import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID,
  IsInt, Min, Max, IsArray, ValidateNested, IsBoolean
} from "class-validator";
import { Type } from "class-transformer";
import { PlanningModalidad, NivelEducativo, PlanningStatus, CampoFormativo, EjeArticulador } from "@prisma/client";

export class CampoSeleccionadoDto {
  @IsString()
  @IsNotEmpty()
  campoFormativoId: string; // e.g. "LENGUAJES"

  @IsString()
  @IsNotEmpty()
  contenidoId: string; // e.g. "L_01"

  @IsString()
  @IsNotEmpty()
  pdaLiteral: string; // The literal PDA string chosen by the teacher
}

export class GeneratePlanningDto {
  // Curricular selections (new multi-field format)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoSeleccionadoDto)
  camposSeleccionados: CampoSeleccionadoDto[];

  @IsEnum(PlanningModalidad)
  modalidad: PlanningModalidad;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ejesArticuladores?: string[];

  // Mode: integrated vs standalone
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

  // Admin mode
  @IsOptional()
  @IsUUID()
  targetTeacherProfileId?: string;

  @IsOptional()
  @IsString()
  periodoProyecto?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsInt()
  @Min(1)
  @Max(5)
  activitiesPerDay: number;

  @IsString()
  @IsNotEmpty()
  problematica: string;

  @IsString()
  @IsNotEmpty()
  proposito: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instrumentoEvaluacion?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ajustesRazonables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actividadesPmc?: string[];

  // Still keep contextoInicial as optional context hint
  @IsOptional()
  @IsString()
  contextoInicial?: string;
}

export class UpdatePlanningDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  periodoProyecto?: string;

  @IsOptional()
  @IsString()
  problematica?: string;

  @IsOptional()
  @IsString()
  proposito?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instrumentoEvaluacion?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ajustesRazonables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actividadesPmc?: string[];

  @IsOptional()
  fundamentacion?: any;

  @IsOptional()
  matrizDidactica?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ejesArticuladores?: string[];

  @IsOptional()
  @IsEnum(PlanningStatus)
  status?: PlanningStatus;
}
