import { TeachersService } from "./teachers.service";
import { CreateTeacherDto, UpdateTeacherDto } from "./teachers.dto";
import { RequestUser } from "../../common/types";
export declare class TeachersController {
    private readonly teachersService;
    constructor(teachersService: TeachersService);
    findAll(user: RequestUser, schoolIdFilter?: string): Promise<import("../../common/types").ApiResponse<({
        school: {
            code: string;
            name: string;
        };
        teacherProfile: {
            employeeNumber: string | null;
            specialty: string | null;
            hireDate: Date | null;
            allowedModules: string[];
        } | null;
    } & {
        id: string;
        phone: string | null;
        email: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        supabaseUid: string;
        role: import(".prisma/client").$Enums.UserRole;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    })[]>>;
    findById(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        school: {
            code: string;
            name: string;
        };
        teacherProfile: ({
            groupAssignments: ({
                group: {
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
                } & {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    schoolId: string;
                    schoolYearId: string;
                    gradeId: string;
                    maxStudents: number | null;
                };
            } & {
                id: string;
                groupId: string;
                teacherProfileId: string;
                isHomeroom: boolean;
            })[];
            subjectAssignments: ({
                subject: {
                    id: string;
                    code: string | null;
                    name: string;
                    createdAt: Date;
                    schoolId: string;
                    description: string | null;
                };
            } & {
                id: string;
                subjectId: string;
                groupId: string;
                teacherProfileId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            employeeNumber: string | null;
            specialty: string | null;
            hireDate: Date | null;
            allowedModules: string[];
        }) | null;
    } & {
        id: string;
        phone: string | null;
        email: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        supabaseUid: string;
        role: import(".prisma/client").$Enums.UserRole;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    }>>;
    create(dto: CreateTeacherDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        teacherProfile: {
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
        phone: string | null;
        email: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        supabaseUid: string;
        role: import(".prisma/client").$Enums.UserRole;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    }>>;
    update(id: string, dto: UpdateTeacherDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        teacherProfile: {
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
        phone: string | null;
        email: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        supabaseUid: string;
        role: import(".prisma/client").$Enums.UserRole;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    }>>;
}
