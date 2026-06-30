import { UserRole } from "@prisma/client";

export interface JwtPayload {
  sub: string;        // supabase_uid
  email: string;
  role: UserRole;
  schoolId: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;         // users.id (our DB)
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

export function successResponse<T>(
  data: T,
  meta: Record<string, unknown> | null = null,
): ApiResponse<T> {
  return { data, meta, error: null };
}

export function errorResponse(message: string): ApiResponse<null> {
  return { data: null, meta: null, error: message };
}
