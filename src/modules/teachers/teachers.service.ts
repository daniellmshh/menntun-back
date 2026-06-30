import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, UserRole } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { CreateTeacherDto, UpdateTeacherDto } from "./teachers.dto";
import { RequestUser } from "../../common/types";

@Injectable()
export class TeachersService {
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

  async findAll(currentUser: RequestUser, schoolIdFilter?: string) {
    let targetSchoolId: string | undefined;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      targetSchoolId = schoolIdFilter;
    } else if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      targetSchoolId = currentUser.schoolId;
    } else {
      // Teachers can view the directory of their own school
      targetSchoolId = currentUser.schoolId;
    }

    const whereClause: any = {
      role: UserRole.TEACHER,
    };

    if (targetSchoolId) {
      whereClause.schoolId = targetSchoolId;
    }

    return this.prisma.user.findMany({
      where: whereClause,
      include: {
        school: {
          select: { name: true, code: true },
        },
        teacherProfile: {
          select: {
            employeeNumber: true,
            specialty: true,
            hireDate: true,
            allowedModules: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, currentUser: RequestUser) {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.TEACHER,
      },
      include: {
        school: {
          select: { name: true, code: true },
        },
        teacherProfile: {
          include: {
            groupAssignments: {
              include: {
                group: {
                  include: {
                    grade: true,
                    schoolYear: true,
                  },
                },
              },
            },
            subjectAssignments: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    // Enforce boundary checks
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== teacher.schoolId
    ) {
      throw new ForbiddenException("Access denied to this teacher's details");
    }

    return teacher;
  }

  async create(dto: CreateTeacherDto, currentUser: RequestUser) {
    let schoolId = dto.schoolId;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (!schoolId) {
        throw new BadRequestException("schoolId is required for SUPER_ADMIN");
      }
    } else if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (schoolId && schoolId !== currentUser.schoolId) {
        throw new ForbiddenException("Cannot create teacher for another school");
      }
      schoolId = currentUser.schoolId;
    } else {
      throw new ForbiddenException("Only administrators can register teachers");
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException("School not found");
    }

    // Check if user already exists locally
    const existing = await this.prisma.user.findFirst({
      where: { schoolId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists in this school");
    }

    // Validate allowedModules against school's contracted modules
    if (dto.allowedModules && dto.allowedModules.length > 0) {
      const activeSchoolModules = await this.prisma.schoolModule.findMany({
        where: { schoolId, active: true },
        select: { module: true },
      });
      const activeNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());

      const invalidModules = dto.allowedModules.filter(
        (m) => !activeNames.includes(m.toLowerCase()),
      );
      if (invalidModules.length > 0) {
        throw new BadRequestException(
          `Cannot grant permissions to inactive school modules: ${invalidModules.join(", ")}`,
        );
      }
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        schoolId,
        role: UserRole.TEACHER,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    if (authError || !authData?.user) {
      throw new BadRequestException(authError?.message || "Failed to register teacher in Supabase");
    }

    const supabaseUid = authData.user.id;

    // 2. Create in local DB
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseUid,
          email: dto.email,
          schoolId,
          role: UserRole.TEACHER,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          employeeNumber: dto.employeeNumber,
          specialty: dto.specialty,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
          allowedModules: dto.allowedModules || [],
        },
      });

      return {
        ...user,
        teacherProfile,
      };
    });
  }

  async update(id: string, dto: UpdateTeacherDto, currentUser: RequestUser) {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.TEACHER,
      },
      include: {
        teacherProfile: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    // Enforce boundary checks
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== teacher.schoolId
    ) {
      throw new ForbiddenException("Cannot modify this teacher's details");
    }

    // Validate allowedModules if provided
    if (dto.allowedModules !== undefined) {
      if (dto.allowedModules.length > 0) {
        const activeSchoolModules = await this.prisma.schoolModule.findMany({
          where: { schoolId: teacher.schoolId, active: true },
          select: { module: true },
        });
        const activeNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());

        const invalidModules = dto.allowedModules.filter(
          (m) => !activeNames.includes(m.toLowerCase()),
        );
        if (invalidModules.length > 0) {
          throw new BadRequestException(
            `Cannot grant permissions to inactive school modules: ${invalidModules.join(", ")}`,
          );
        }
      }
    }

    const userUpdatePayload: any = {};
    if (dto.firstName !== undefined) userUpdatePayload.firstName = dto.firstName;
    if (dto.lastName !== undefined) userUpdatePayload.lastName = dto.lastName;
    if (dto.phone !== undefined) userUpdatePayload.phone = dto.phone;
    if (dto.active !== undefined) userUpdatePayload.active = dto.active;

    const profileUpdatePayload: any = {};
    if (dto.employeeNumber !== undefined) profileUpdatePayload.employeeNumber = dto.employeeNumber;
    if (dto.specialty !== undefined) profileUpdatePayload.specialty = dto.specialty;
    if (dto.hireDate !== undefined) profileUpdatePayload.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    if (dto.allowedModules !== undefined) profileUpdatePayload.allowedModules = dto.allowedModules;

    // Update locally in transaction
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: userUpdatePayload,
      });

      const teacherProfile = await tx.teacherProfile.update({
        where: { userId: id },
        data: profileUpdatePayload,
      });

      return {
        ...user,
        teacherProfile,
      };
    });

    // Sync metadata & status to Supabase Auth if needed
    const supabaseMetadata: any = {};
    if (dto.firstName !== undefined) supabaseMetadata.firstName = dto.firstName;
    if (dto.lastName !== undefined) supabaseMetadata.lastName = dto.lastName;

    const supabaseUpdatePayload: any = {};
    if (Object.keys(supabaseMetadata).length > 0) {
      supabaseUpdatePayload.user_metadata = {
        ...(teacher.firstName !== dto.firstName || teacher.lastName !== dto.lastName
          ? {
              role: UserRole.TEACHER,
              schoolId: teacher.schoolId,
              firstName: dto.firstName ?? teacher.firstName,
              lastName: dto.lastName ?? teacher.lastName,
            }
          : {}),
      };
    }

    if (dto.active !== undefined) {
      // In Supabase Auth admin API, we can ban/unban or toggle email confirm. Let's suspend via App Metadata
      supabaseUpdatePayload.app_metadata = {
        suspended: !dto.active,
      };
    }

    if (Object.keys(supabaseUpdatePayload).length > 0) {
      const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(
        teacher.supabaseUid,
        supabaseUpdatePayload,
      );
      if (authError) {
        console.error("Failed to sync updated teacher credentials to Supabase:", authError);
      }
    }

    return updatedUser;
  }
}
