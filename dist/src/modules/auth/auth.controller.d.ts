import { AuthService } from "./auth.service";
import { SyncUserDto } from "./auth.dto";
import { RequestUser } from "../../common/types";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sync(authHeader: string, dto: SyncUserDto): Promise<import("../../common/types").ApiResponse<{
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
    } | null>>;
    me(user: RequestUser): Promise<import("../../common/types").ApiResponse<{
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
    }>>;
    meModules(user: RequestUser): Promise<import("../../common/types").ApiResponse<string[]>>;
}
