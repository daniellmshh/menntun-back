import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "../../lib/prisma";
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  UpdateModulesDto,
  CreateSchoolUserDto,
  UpdateSchoolUserDto,
} from "./schools.dto";
import { RequestUser } from "../../common/types";
import { UserRole } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
const CORE_MODULES = ["auth", "schools"];

const ALL_MODULES = [
  "academic",
  "schoolYears",
  "gradesCatalog",
  "groups",
  "students",
  "teachers",
  "parents",
  "attendance",
  "grades",
  "tasks",
  "communications",
  "planning",
  "enrollments",
  "scholarships",
  "reports",
];

@Injectable()
export class SchoolsService {
  private readonly supabaseAdmin;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("supabase.url") || "";
    const serviceRoleKey = this.configService.get<string>("supabase.serviceRoleKey") || "";
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // ─── SUPER ADMIN: list all schools ───────────────────────────────
  async findAll() {
    return prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
        schoolModules: {
          where: { active: true },
          select: { module: true },
        },
      },
    });
  }

  // ─── SUPER ADMIN: create school ──────────────────────────────────
  async create(dto: CreateSchoolDto) {
    const existing = await prisma.school.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `A school with code "${dto.code}" already exists`,
      );
    }

    const school = await prisma.school.create({ data: dto });

    // Activate all modules for new school by default
    await prisma.schoolModule.createMany({
      data: ALL_MODULES.map((module) => ({
        schoolId: school.id,
        module,
        active: true,
      })),
    });

    return school;
  }

  // ─── GET OWN SCHOOL (school_admin / any role) ────────────────────
  async findMySchool(currentUser: RequestUser) {
    const school = await prisma.school.findUnique({
      where: { id: currentUser.schoolId },
      include: {
        schoolModules: {
          orderBy: { module: "asc" },
        },
        schoolYears: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!school) {
      throw new NotFoundException("School not found");
    }

    return school;
  }

  // ─── SUPER ADMIN: get any school by id ───────────────────────────
  async findById(id: string, currentUser: RequestUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== id
    ) {
      throw new ForbiddenException("Access denied");
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        schoolModules: { orderBy: { module: "asc" } },
        _count: { select: { users: true } },
      },
    });

    if (!school) throw new NotFoundException("School not found");
    return school;
  }

  // ─── UPDATE SCHOOL ────────────────────────────────────────────────
  async update(id: string, dto: UpdateSchoolDto, currentUser: RequestUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== id
    ) {
      throw new ForbiddenException("Access denied");
    }

    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException("School not found");

    return prisma.school.update({ where: { id }, data: dto });
  }

  // ─── GET MODULES FOR A SCHOOL ─────────────────────────────────────
  async getModules(schoolId: string, currentUser: RequestUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== schoolId
    ) {
      throw new ForbiddenException("Access denied");
    }

    const activeModules = await prisma.schoolModule.findMany({
      where: { schoolId },
      orderBy: { module: "asc" },
    });

    // Return full module list with active status, excluding internal system modules
    return ALL_MODULES
      .filter((module) => !["auth", "schools"].includes(module))
      .map((module) => ({
        module,
        active: activeModules.find((m) => m.module === module)?.active ?? false,
        isCore: CORE_MODULES.includes(module),
      }));
  }

  // ─── UPDATE MODULE STATUS ─────────────────────────────────────────
  async updateModules(
    schoolId: string,
    dto: UpdateModulesDto,
    currentUser: RequestUser,
  ) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      (currentUser.role !== UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)
    ) {
      throw new ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can change module status");
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException("School not found");

    // Prevent disabling core modules
    const coreConflicts = dto.modules.filter((m) =>
      CORE_MODULES.includes(m),
    );
    if (coreConflicts.length > 0) {
      throw new ForbiddenException(
        `Cannot modify core modules: ${coreConflicts.join(", ")}`,
      );
    }

    // Upsert each module
    await Promise.all(
      dto.modules.map((module) =>
        prisma.schoolModule.upsert({
          where: { schoolId_module: { schoolId, module } },
          update: { active: dto.active },
          create: { schoolId, module, active: dto.active },
        }),
      ),
    );

    return this.getModules(schoolId, currentUser);
  }

  // ─── GET SCHOOL STATS ─────────────────────────────────────────────
  async getStats(currentUser: RequestUser) {
    const schoolId = currentUser.schoolId;

    const [totalUsers, totalStudents, totalTeachers, activeModules] =
      await Promise.all([
        prisma.user.count({ where: { schoolId, active: true } }),
        prisma.user.count({
          where: { schoolId, role: UserRole.STUDENT, active: true },
        }),
        prisma.user.count({
          where: { schoolId, role: UserRole.TEACHER, active: true },
        }),
        prisma.schoolModule.count({
          where: { schoolId, active: true },
        }),
      ]);

    return {
      totalUsers,
      totalStudents,
      totalTeachers,
      activeModules,
    };
  }

  // ─── USER ASSIGNMENT & MANAGEMENT ───────────────────────────────────
  async findUsers(schoolId: string, currentUser: RequestUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      (currentUser.role !== UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)
    ) {
      throw new ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can view school users");
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException("School not found");

    return prisma.user.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createUser(schoolId: string, dto: CreateSchoolUserDto, currentUser: RequestUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      (currentUser.role !== UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)
    ) {
      throw new ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can create users");
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException("School not found");

    // Check if user already exists in local DB
    const existing = await prisma.user.findFirst({
      where: { schoolId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists in this school");
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        schoolId,
        role: dto.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    if (authError || !authData?.user) {
      throw new BadRequestException(authError?.message || "Failed to create user in Supabase");
    }

    const supabaseUid = authData.user.id;

    // 2. Create user in local DB
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseUid,
          email: dto.email,
          schoolId,
          role: dto.role,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      // 3. Create profiles if necessary
      if (dto.role === UserRole.TEACHER) {
        await tx.teacherProfile.create({
          data: { userId: user.id },
        });
      } else if (dto.role === UserRole.STUDENT) {
        await tx.studentProfile.create({
          data: { userId: user.id },
        });
      } else if (dto.role === UserRole.PARENT || dto.role === UserRole.TUTOR) {
        await tx.parentProfile.create({
          data: { userId: user.id },
        });
      }

      return user;
    });
  }

  async updateUser(
    schoolId: string,
    userId: string,
    dto: UpdateSchoolUserDto,
    currentUser: RequestUser,
  ) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      (currentUser.role !== UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)
    ) {
      throw new ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can update users");
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, schoolId },
    });
    if (!user) {
      throw new NotFoundException("User not found in this school");
    }

    // Prepare update payload
    const updateData: any = {};
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    // Update in local DB
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Sync metadata to Supabase Auth if role/names changed
    if (
      dto.role !== undefined ||
      dto.firstName !== undefined ||
      dto.lastName !== undefined
    ) {
      const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(
        user.supabaseUid,
        {
          user_metadata: {
            role: dto.role ?? user.role,
            firstName: dto.firstName ?? user.firstName,
            lastName: dto.lastName ?? user.lastName,
          },
        }
      );
      if (authError) {
        console.error("Failed to sync updated user metadata to Supabase:", authError);
      }
    }

    return updatedUser;
  }
}
