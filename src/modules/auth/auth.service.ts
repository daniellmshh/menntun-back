import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, UserRole } from "@prisma/client";
import { SyncUserDto } from "./auth.dto";
import { RequestUser } from "../../common/types";

@Injectable()
export class AuthService {
  private readonly supabaseAdmin;

  constructor(
    private readonly configService: ConfigService,
    @Inject("PRISMA") private readonly prisma: PrismaClient,
  ) {
    const supabaseUrl = this.configService.get<string>("supabase.url") || "";
    const serviceRoleKey = this.configService.get<string>("supabase.serviceRoleKey") || "";
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async syncUser(token: string, dto: SyncUserDto) {
    // Use Supabase Admin API to validate the token — correctly handles ES256 JWTs
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new UnauthorizedException("Invalid or expired Supabase token");
    }

    const supabaseUid = authData.user.id;
    const email = authData.user.email;

    if (!supabaseUid || !email) {
      throw new UnauthorizedException("Invalid token payload");
    }

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { supabaseUid },
      });

      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone ?? user.phone,
            avatarUrl: dto.avatarUrl ?? user.avatarUrl,
          },
          include: {
            teacherProfile: true,
            studentProfile: true,
            parentProfile: true,
          },
        });
        return user;
      }

      user = await tx.user.create({
        data: {
          supabaseUid,
          email,
          schoolId: dto.schoolId,
          role: dto.role,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          avatarUrl: dto.avatarUrl,
        },
      });

      if (dto.role === "TEACHER") {
        await tx.teacherProfile.create({
          data: { userId: user.id },
        });
      } else if (dto.role === "STUDENT") {
        await tx.studentProfile.create({
          data: { userId: user.id },
        });
      } else if (dto.role === "PARENT" || dto.role === "TUTOR") {
        await tx.parentProfile.create({
          data: { userId: user.id },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          teacherProfile: true,
          studentProfile: true,
          parentProfile: true,
        },
      });
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: true,
        studentProfile: true,
        parentProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user;
  }

  async getMeModules(currentUser: RequestUser): Promise<string[]> {
    // 1. Get all modules that are active for this school
    const activeSchoolModules = await this.prisma.schoolModule.findMany({
      where: {
        schoolId: currentUser.schoolId,
        active: true,
      },
      select: {
        module: true,
      },
    });

    const activeSchoolNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());

    // 2. If the user is a TEACHER, also filter by their personal allowedModules list
    if (currentUser.role === UserRole.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.id },
        select: { allowedModules: true },
      });

      const allowedModules: string[] = teacherProfile?.allowedModules ?? [];

      // If the teacher has specific module restrictions, intersect with school's active modules
      if (allowedModules.length > 0) {
        const allowedLower = allowedModules.map((m) => m.toLowerCase());
        // Only return modules that are both active at school level AND allowed for this teacher
        const filtered = activeSchoolNames.filter((m) => allowedLower.includes(m));
        return Array.from(new Set(filtered));
      }
    }

    // 3. For non-teachers (or teachers with no restrictions), return all school-active modules
    // Core modules are always visible in the sidebar (not gated)
    const coreModules = ["auth", "schools", "academic"];
    return Array.from(new Set([...coreModules, ...activeSchoolNames]));
  }
}
