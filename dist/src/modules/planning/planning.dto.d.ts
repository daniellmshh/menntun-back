import { PlanningModalidad, NivelEducativo, PlanningStatus, CampoFormativo, EjeArticulador } from "@prisma/client";
export declare class GeneratePlanningDto {
    contextoInicial: string;
    modalidad?: PlanningModalidad;
    campoFormativo?: CampoFormativo;
    contenidoId?: string;
    ejesArticuladores?: EjeArticulador[];
    groupId?: string;
    subjectId?: string;
    standaloneLevel?: NivelEducativo;
    standaloneGradeOrder?: number;
    targetTeacherProfileId?: string;
}
export declare class UpdatePlanningDto {
    title?: string;
    contenidos?: string;
    pda?: string;
    relevanciaSocial?: string;
    produccionSugerida?: string;
    fases?: any;
    recursos?: any;
    campoFormativo?: CampoFormativo;
    ejesArticuladores?: EjeArticulador[];
    status?: PlanningStatus;
}
