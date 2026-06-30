import { CreateSchoolDto, UpdateSchoolDto, UpdateModulesDto, CreateSchoolUserDto, UpdateSchoolUserDto } from "./schools.dto";
import { RequestUser } from "../../common/types";
import { ConfigService } from "@nestjs/config";
export declare class SchoolsService {
    private readonly configService;
    private readonly supabaseAdmin;
    constructor(configService: ConfigService);
    findAll(): Promise<({
        schoolModules: {
            module: string;
        }[];
        _count: {
            users: number;
        };
    } & {
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    create(dto: CreateSchoolDto): Promise<{
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findMySchool(currentUser: RequestUser): Promise<{
        schoolModules: {
            id: string;
            active: boolean;
            createdAt: Date;
            schoolId: string;
            module: string;
        }[];
        schoolYears: {
            id: string;
            name: string;
            startDate: Date;
            endDate: Date;
        }[];
        _count: {
            users: number;
        };
    } & {
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findById(id: string, currentUser: RequestUser): Promise<{
        schoolModules: {
            id: string;
            active: boolean;
            createdAt: Date;
            schoolId: string;
            module: string;
        }[];
        _count: {
            users: number;
        };
    } & {
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateSchoolDto, currentUser: RequestUser): Promise<{
        id: string;
        code: string;
        name: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        logoUrl: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getModules(schoolId: string, currentUser: RequestUser): Promise<{
        module: string;
        active: boolean;
        isCore: boolean;
    }[]>;
    updateModules(schoolId: string, dto: UpdateModulesDto, currentUser: RequestUser): Promise<{
        module: string;
        active: boolean;
        isCore: boolean;
    }[]>;
    getStats(currentUser: RequestUser): Promise<{
        totalUsers: number;
        totalStudents: number;
        totalTeachers: number;
        activeModules: number;
    }>;
    findUsers(schoolId: string, currentUser: RequestUser): Promise<{
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
    }[]>;
    createUser(schoolId: string, dto: CreateSchoolUserDto, currentUser: RequestUser): Promise<{
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
    updateUser(schoolId: string, userId: string, dto: UpdateSchoolUserDto, currentUser: RequestUser): Promise<{
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
}
