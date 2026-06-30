import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { SyncUserDto } from "./auth.dto";
import { RequestUser } from "../../common/types";
export declare class AuthService {
    private readonly configService;
    private readonly prisma;
    private readonly supabaseAdmin;
    constructor(configService: ConfigService, prisma: PrismaClient);
    syncUser(token: string, dto: SyncUserDto): Promise<{
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
    } | null>;
    getMe(userId: string): Promise<{
        teacherProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            employeeNumber: string | null;
            specialty: string | null;
            hireDate: Date | null;
            allowedModules: string[];
        } | null;
        studentProfile: {
            id: string;
            address: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            enrollmentNumber: string | null;
            birthDate: Date | null;
            gender: import(".prisma/client").$Enums.Gender | null;
            bloodType: string | null;
        } | null;
        parentProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            occupation: string | null;
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
    }>;
    getMeModules(currentUser: RequestUser): Promise<string[]>;
}
