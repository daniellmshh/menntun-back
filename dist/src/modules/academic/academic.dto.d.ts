import { NivelEducativo } from "@prisma/client";
export declare class CreatePeriodDto {
    name: string;
    startDate: string;
    endDate: string;
    order: number;
}
export declare class CreateSchoolYearDto {
    name: string;
    startDate: string;
    endDate: string;
    schoolId?: string;
    periods?: CreatePeriodDto[];
}
export declare class UpdateSchoolYearDto {
    name?: string;
    startDate?: string;
    endDate?: string;
    active?: boolean;
}
export declare class UpdatePeriodDto {
    name?: string;
    startDate?: string;
    endDate?: string;
    order?: number;
}
export declare class CreateGradeDto {
    name: string;
    order: number;
    level?: NivelEducativo;
    schoolId?: string;
}
export declare class UpdateGradeDto {
    name?: string;
    order?: number;
    level?: NivelEducativo;
}
export declare class CreateGroupDto {
    gradeId: string;
    schoolYearId: string;
    name: string;
    maxStudents?: number;
    schoolId?: string;
}
export declare class UpdateGroupDto {
    gradeId?: string;
    name?: string;
    maxStudents?: number;
}
export declare class AssignGroupTeacherDto {
    teacherProfileId: string;
    isHomeroom?: boolean;
}
export declare class CreateSubjectDto {
    name: string;
    code?: string;
    description?: string;
}
export declare class UpdateSubjectDto {
    name?: string;
    code?: string;
    description?: string;
}
export declare class AssignSubjectTeacherDto {
    teacherProfileId: string;
    groupId: string;
}
