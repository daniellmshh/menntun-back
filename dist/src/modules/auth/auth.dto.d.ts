import { UserRole } from "@prisma/client";
export declare class SyncUserDto {
    schoolId: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
}
