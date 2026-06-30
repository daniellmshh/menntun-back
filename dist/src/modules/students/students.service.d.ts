import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { CreateStudentDto, UpdateStudentDto } from "./students.dto";
import { RequestUser } from "../../common/types";
export declare class StudentsService {
    private readonly configService;
    private readonly prisma;
    private readonly supabaseAdmin;
    constructor(configService: ConfigService, prisma: PrismaClient);
    findAll(currentUser: RequestUser, schoolIdFilter?: string): Promise<({
        school: {
            code: string;
            name: string;
        };
        studentProfile: ({
            enrollments: ({
                group: {
                    id: string;
                    name: string;
                    schoolYear: {
                        name: string;
                        active: boolean;
                    };
                    grade: {
                        name: string;
                    };
                };
            } & {
                id: string;
                updatedAt: Date;
                studentProfileId: string;
                groupId: string;
                status: import(".prisma/client").$Enums.EnrollmentStatus;
                enrolledAt: Date;
            })[];
        } & {
            id: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            enrollmentNumber: string | null;
            birthDate: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bloodType: string | null;
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
    })[]>;
    findById(id: string, currentUser: RequestUser): Promise<{
        school: {
            code: string;
            name: string;
        };
        studentProfile: ({
            enrollments: ({
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
                updatedAt: Date;
                studentProfileId: string;
                groupId: string;
                status: import(".prisma/client").$Enums.EnrollmentStatus;
                enrolledAt: Date;
            })[];
            parentLinks: ({
                parentProfile: {
                    user: {
                        phone: string | null;
                        email: string;
                        firstName: string;
                        lastName: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    occupation: string | null;
                };
            } & {
                id: string;
                studentProfileId: string;
                parentProfileId: string;
                relationship: string;
                isPrimary: boolean;
            })[];
        } & {
            id: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            enrollmentNumber: string | null;
            birthDate: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bloodType: string | null;
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
    }>;
    create(dto: CreateStudentDto, currentUser: RequestUser): Promise<{
        studentProfile: {
            enrollments: any[];
            id: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            enrollmentNumber: string | null;
            birthDate: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bloodType: string | null;
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
    }>;
    update(id: string, dto: UpdateStudentDto, currentUser: RequestUser): Promise<{
        studentProfile: {
            enrollments: ({
                group: {
                    id: string;
                    name: string;
                    schoolYear: {
                        name: string;
                        active: boolean;
                    };
                    grade: {
                        name: string;
                    };
                };
            } & {
                id: string;
                updatedAt: Date;
                studentProfileId: string;
                groupId: string;
                status: import(".prisma/client").$Enums.EnrollmentStatus;
                enrolledAt: Date;
            })[];
            id: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            enrollmentNumber: string | null;
            birthDate: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bloodType: string | null;
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
    }>;
    delete(id: string, currentUser: RequestUser): Promise<{
        id: string;
        email: string;
        success: boolean;
    }>;
}
