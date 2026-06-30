import { AcademicService } from "./academic.service";
import { CreateGradeDto, UpdateGradeDto, CreateGroupDto, UpdateGroupDto, AssignGroupTeacherDto, CreateSubjectDto, UpdateSubjectDto, AssignSubjectTeacherDto, CreateSchoolYearDto, UpdateSchoolYearDto, CreatePeriodDto, UpdatePeriodDto } from "./academic.dto";
import { RequestUser } from "../../common/types";
export declare class AcademicController {
    private readonly academicService;
    constructor(academicService: AcademicService);
    findAllGrades(user: RequestUser, schoolId?: string): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findAllGradesAllSchools(user: RequestUser): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    createGrade(user: RequestUser, dto: CreateGradeDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    }>>;
    updateGrade(id: string, user: RequestUser, dto: UpdateGradeDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        name: string;
        createdAt: Date;
        schoolId: string;
        order: number;
        level: import(".prisma/client").$Enums.NivelEducativo | null;
    }>>;
    deleteGrade(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
    findAllSchoolYears(user: RequestUser, schoolId?: string): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findAllSchoolYearsAllSchools(user: RequestUser): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findActiveSchoolYear(user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    findSchoolYearById(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    createSchoolYear(user: RequestUser, dto: CreateSchoolYearDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    updateSchoolYear(id: string, user: RequestUser, dto: UpdateSchoolYearDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    closeSchoolYear(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    deleteSchoolYear(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
    addPeriod(id: string, user: RequestUser, dto: CreatePeriodDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        name: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        schoolYearId: string;
        order: number;
    }>>;
    updatePeriod(id: string, pid: string, user: RequestUser, dto: UpdatePeriodDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        name: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        schoolYearId: string;
        order: number;
    }>>;
    deletePeriod(id: string, pid: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
    findAllGroups(user: RequestUser, schoolId?: string, schoolYearId?: string): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findAllGroupsAllSchools(user: RequestUser): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findGroupById(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<({
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
    }) | null>>;
    createGroup(user: RequestUser, dto: CreateGroupDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    updateGroup(id: string, user: RequestUser, dto: UpdateGroupDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    assignGroupTeacher(id: string, user: RequestUser, dto: AssignGroupTeacherDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    removeGroupTeacher(id: string, tid: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
    findAllSubjects(user: RequestUser): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    findSubjectById(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    } | null>>;
    createSubject(user: RequestUser, dto: CreateSubjectDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    }>>;
    updateSubject(id: string, user: RequestUser, dto: UpdateSubjectDto): Promise<import("../../common/types").ApiResponse<{
        id: string;
        code: string | null;
        name: string;
        createdAt: Date;
        schoolId: string;
        description: string | null;
    }>>;
    deleteSubject(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
    assignSubjectTeacher(id: string, user: RequestUser, dto: AssignSubjectTeacherDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    removeSubjectTeacher(id: string, tid: string, gid: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        message: string;
    }>>;
}
