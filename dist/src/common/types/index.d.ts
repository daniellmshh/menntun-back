import { UserRole } from "@prisma/client";
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    schoolId: string;
    iat?: number;
    exp?: number;
}
export interface RequestUser {
    id: string;
    supabaseUid: string;
    email: string;
    role: UserRole;
    schoolId: string;
    firstName: string;
    lastName: string;
}
export interface ApiResponse<T> {
    data: T | null;
    meta: Record<string, unknown> | null;
    error: string | null;
}
export declare function successResponse<T>(data: T, meta?: Record<string, unknown> | null): ApiResponse<T>;
export declare function errorResponse(message: string): ApiResponse<null>;
