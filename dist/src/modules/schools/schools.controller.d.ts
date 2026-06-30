import { SchoolsService } from "./schools.service";
import { CreateSchoolDto, UpdateSchoolDto, UpdateModulesDto, CreateSchoolUserDto, UpdateSchoolUserDto } from "./schools.dto";
import { RequestUser } from "../../common/types";
export declare class SchoolsController {
    private readonly schoolsService;
    constructor(schoolsService: SchoolsService);
    findAll(): Promise<import("../../common/types").ApiResponse<({
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
    })[]>>;
    create(dto: CreateSchoolDto): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    findMySchool(user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    getStats(user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        totalUsers: number;
        totalStudents: number;
        totalTeachers: number;
        activeModules: number;
    }>>;
    findById(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    update(id: string, dto: UpdateSchoolDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    getModules(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        module: string;
        active: boolean;
        isCore: boolean;
    }[]>>;
    updateModules(id: string, dto: UpdateModulesDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
        module: string;
        active: boolean;
        isCore: boolean;
    }[]>>;
    findUsers(id: string, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }[]>>;
    createUser(id: string, dto: CreateSchoolUserDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    updateUser(id: string, userId: string, dto: UpdateSchoolUserDto, user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
