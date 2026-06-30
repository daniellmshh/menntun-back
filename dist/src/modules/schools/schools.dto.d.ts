import { UserRole } from "@prisma/client";
export declare class CreateSchoolDto {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
}
export declare class UpdateSchoolDto {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    active?: boolean;
}
export declare class UpdateModulesDto {
    modules: string[];
    active: boolean;
}
export declare class CreateSchoolUserDto {
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    phone?: string;
    password: string;
}
export declare class UpdateSchoolUserDto {
    role?: UserRole;
    active?: boolean;
    firstName?: string;
    lastName?: string;
    phone?: string;
}
