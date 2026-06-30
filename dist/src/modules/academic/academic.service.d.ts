import { CreateGradeDto, UpdateGradeDto, CreateGroupDto, UpdateGroupDto, AssignGroupTeacherDto, CreateSubjectDto, UpdateSubjectDto, AssignSubjectTeacherDto, CreateSchoolYearDto, UpdateSchoolYearDto, CreatePeriodDto, UpdatePeriodDto } from "./academic.dto";
import { RequestUser } from "../../common/types";
export declare class AcademicService {
    private requireAdmin;
    private findGradeOrFail;
    private findGroupOrFail;
    private findSubjectOrFail;
    findAllGrades(schoolId: string, user?: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    })[]>;
    findAllGradesAllSchools(user: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    })[]>;
    createGrade(schoolId: string, dto: CreateGradeDto, user: RequestUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    }>;
    updateGrade(id: string, dto: UpdateGradeDto, user: RequestUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    }>;
    deleteGrade(id: string, user: RequestUser): Promise<{
        message: string;
    }>;
    findAllSchoolYears(schoolId: string, user: RequestUser): Promise<({
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
    findAllSchoolYearsAllSchools(user: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    })[]>;
    findSchoolYearById(id: string, user: RequestUser): Promise<{
        school: {
            code: string;
            name: string;
        };
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    }>;
    findActiveSchoolYear(schoolId: string): Promise<{
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    }>;
    createSchoolYear(dto: CreateSchoolYearDto, user: RequestUser): Promise<{
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    }>;
    updateSchoolYear(id: string, dto: UpdateSchoolYearDto, user: RequestUser): Promise<{
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    }>;
    closeSchoolYear(id: string, user: RequestUser): Promise<{
        periods: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            schoolYearId: string;
            order: number;
        }[];
        _count: {
            groups: number;
        };
    } & {
        id: string;
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        startDate: Date;
        endDate: Date;
    }>;
    deleteSchoolYear(id: string, user: RequestUser): Promise<{
        message: string;
    }>;
    addPeriod(schoolYearId: string, dto: CreatePeriodDto, user: RequestUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        schoolYearId: string;
        order: number;
    }>;
    updatePeriod(schoolYearId: string, periodId: string, dto: UpdatePeriodDto, user: RequestUser): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        schoolYearId: string;
        order: number;
    }>;
    deletePeriod(schoolYearId: string, periodId: string, user: RequestUser): Promise<{
        message: string;
    }>;
    findAllGroups(schoolId: string, schoolYearId?: string, user?: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        schoolYear: {
            name: string;
            active: boolean;
        };
        grade: {
            name: string;
            level: import(".prisma/client").$Enums.NivelEducativo | null;
        };
        _count: {
            teachers: number;
            enrollments: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        schoolYearId: string;
        gradeId: string;
        maxStudents: number | null;
    })[]>;
    findAllGroupsAllSchools(user: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        schoolYear: {
            name: string;
            active: boolean;
        };
        grade: {
            name: string;
            level: import(".prisma/client").$Enums.NivelEducativo | null;
        };
        _count: {
            teachers: number;
            enrollments: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        schoolYearId: string;
        gradeId: string;
        maxStudents: number | null;
    })[]>;
    findGroupById(id: string, user: RequestUser): Promise<({
        school: {
            code: string;
            name: string;
        };
        teachers: ({
            teacherProfile: {
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                employeeNumber: string | null;
                specialty: string | null;
                hireDate: Date | null;
                allowedModules: string[];
            };
        } & {
            id: string;
            groupId: string;
            teacherProfileId: string;
            isHomeroom: boolean;
        })[];
        schoolYear: {
            id: string;
            name: string;
            active: boolean;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            startDate: Date;
            endDate: Date;
        };
        grade: {
            id: string;
            name: string;
            createdAt: Date;
            schoolId: string;
            order: number;
            level: import(".prisma/client").$Enums.NivelEducativo | null;
        };
        _count: {
            enrollments: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        schoolYearId: string;
        gradeId: string;
        maxStudents: number | null;
    }) | null>;
    createGroup(schoolId: string, dto: CreateGroupDto, user: RequestUser): Promise<{
        schoolYear: {
            name: string;
            active: boolean;
        };
        grade: {
            name: string;
            level: import(".prisma/client").$Enums.NivelEducativo | null;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        schoolYearId: string;
        gradeId: string;
        maxStudents: number | null;
    }>;
    updateGroup(id: string, dto: UpdateGroupDto, user: RequestUser): Promise<{
        schoolYear: {
            name: string;
            active: boolean;
        };
        grade: {
            name: string;
            level: import(".prisma/client").$Enums.NivelEducativo | null;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        schoolYearId: string;
        gradeId: string;
        maxStudents: number | null;
    }>;
    assignGroupTeacher(id: string, dto: AssignGroupTeacherDto, user: RequestUser): Promise<{
        teacherProfile: {
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            employeeNumber: string | null;
            specialty: string | null;
            hireDate: Date | null;
            allowedModules: string[];
        };
    } & {
        id: string;
        groupId: string;
        teacherProfileId: string;
        isHomeroom: boolean;
    }>;
    removeGroupTeacher(id: string, teacherProfileId: string, user: RequestUser): Promise<{
        message: string;
    }>;
    findAllSubjects(schoolId: string): Promise<({
        _count: {
            teachers: number;
        };
    } & {
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    })[]>;
    findSubjectById(id: string, schoolId: string): Promise<{
        teachers: {
            group: {
                id: string;
                name: string;
            } | null;
            teacherProfile: {
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                employeeNumber: string | null;
                specialty: string | null;
                hireDate: Date | null;
                allowedModules: string[];
            };
            id: string;
            subjectId: string;
            groupId: string;
            teacherProfileId: string;
        }[];
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    } | null>;
    createSubject(schoolId: string, dto: CreateSubjectDto, user: RequestUser): Promise<{
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    }>;
    updateSubject(id: string, schoolId: string, dto: UpdateSubjectDto, user: RequestUser): Promise<{
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    }>;
    deleteSubject(id: string, schoolId: string, user: RequestUser): Promise<{
        message: string;
    }>;
    assignSubjectTeacher(id: string, schoolId: string, dto: AssignSubjectTeacherDto, user: RequestUser): Promise<{
        group: {
            name: string;
        };
        teacherProfile: {
            user: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            employeeNumber: string | null;
            specialty: string | null;
            hireDate: Date | null;
            allowedModules: string[];
        };
        id: string;
        subjectId: string;
        groupId: string;
        teacherProfileId: string;
    }>;
    removeSubjectTeacher(id: string, teacherProfileId: string, groupId: string, schoolId: string, user: RequestUser): Promise<{
        message: string;
    }>;
}
