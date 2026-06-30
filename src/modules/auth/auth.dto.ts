import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { UserRole } from "@prisma/client";

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
