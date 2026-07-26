import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, UserRole, SchoolType } from "@prisma/client";
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
        let school: any = null;
        if (user.schoolId) {
          school = await tx.school.findUnique({
            where: { id: user.schoolId },
            select: { type: true, name: true },
          });
        }

        return {
          ...user,
          isIndependent: school?.type === 'INDEPENDENT',
          schoolName: school?.name,
        };
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

      const createdUser = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          teacherProfile: true,
          studentProfile: true,
          parentProfile: true,
        },
      });

      let school: any = null;
      if (dto.schoolId) {
        school = await tx.school.findUnique({
          where: { id: dto.schoolId },
          select: { type: true, name: true },
        });
      }

      return {
        ...createdUser,
        isIndependent: school?.type === 'INDEPENDENT',
        schoolName: school?.name,
      };
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

    let schoolName: string | undefined = undefined;
    let isIndependent = false;
    let organizationSchools: any = undefined;

    if (user.role === UserRole.ORG_ADMIN && user.organizationId) {
      organizationSchools = await this.prisma.school.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true, name: true, code: true }
      });
    } else if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { type: true, name: true },
      });
      schoolName = school?.name;
      isIndependent = school?.type === 'INDEPENDENT';
    }

    return {
      ...user,
      isIndependent,
      schoolName,
      organizationSchools,
    };
  }

  async getMeModules(currentUser: RequestUser): Promise<string[]> {
    const targetSchoolId = currentUser.activeSchoolId || currentUser.schoolId;

    if (!targetSchoolId) {
      return [];
    }

    // 1. Get all modules that are active for this school
    const activeSchoolModules = await this.prisma.schoolModule.findMany({
      where: {
        schoolId: targetSchoolId,
        active: true,
      },
      select: {
        module: true,
      },
    });

    const activeSchoolNames = activeSchoolModules.map((sm) => sm.module);

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
        const filtered = activeSchoolNames.filter((m) => allowedLower.includes(m.toLowerCase()));
        return Array.from(new Set(filtered));
      }
    }

    // 3. For non-teachers (or teachers with no restrictions), return only school-active modules.
    // NOTE: We intentionally do NOT hardcode schools/academic here anymore.
    // Each school's active modules control what appears in the sidebar.
    return Array.from(new Set(activeSchoolNames));
  }
}
