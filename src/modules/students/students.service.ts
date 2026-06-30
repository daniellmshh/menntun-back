import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, UserRole, EnrollmentStatus, Gender } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { CreateStudentDto, UpdateStudentDto } from "./students.dto";
import { RequestUser } from "../../common/types";

@Injectable()
export class StudentsService {
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
    } else {
      // SCHOOL_ADMIN and TEACHER can view students in their own school boundary
      targetSchoolId = currentUser.schoolId;
    }

    const whereClause: any = {
      role: UserRole.STUDENT,
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
        studentProfile: {
          include: {
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
              include: {
                group: {
                  select: {
                    id: true,
                    name: true,
                    grade: { select: { name: true } },
                    schoolYear: { select: { name: true, active: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, currentUser: RequestUser) {
    const student = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      include: {
        school: {
          select: { name: true, code: true },
        },
        studentProfile: {
          include: {
            enrollments: {
              include: {
                group: {
                  include: {
                    grade: true,
                    schoolYear: true,
                  },
                },
              },
            },
            parentLinks: {
              include: {
                parentProfile: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Enforce boundary checks
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== student.schoolId
    ) {
      throw new ForbiddenException("Access denied to this student's details");
    }

    return student;
  }

  async create(dto: CreateStudentDto, currentUser: RequestUser) {
    let schoolId = dto.schoolId;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (!schoolId) {
        throw new BadRequestException("schoolId is required for SUPER_ADMIN");
      }
    } else if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (schoolId && schoolId !== currentUser.schoolId) {
        throw new ForbiddenException("Cannot create student for another school");
      }
      schoolId = currentUser.schoolId;
    } else {
      throw new ForbiddenException("Only administrators can register students");
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

    // Validate group if provided
    if (dto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new NotFoundException("Group not found");
      }
      if (group.schoolId !== schoolId) {
        throw new BadRequestException("Group does not belong to the selected school");
      }
      if (group.maxStudents !== null) {
        const activeCount = await this.prisma.enrollment.count({
          where: { groupId: dto.groupId, status: EnrollmentStatus.ACTIVE },
        });
        if (activeCount >= group.maxStudents) {
          throw new BadRequestException(`Group "${group.name}" is already at full capacity (${group.maxStudents} students)`);
        }
      }
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        schoolId,
        role: UserRole.STUDENT,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    if (authError || !authData?.user) {
      throw new BadRequestException(authError?.message || "Failed to register student in Supabase");
    }

    const supabaseUid = authData.user.id;

    // 2. Create in local DB
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseUid,
          email: dto.email,
          schoolId,
          role: UserRole.STUDENT,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          enrollmentNumber: dto.enrollmentNumber || null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender || null,
          bloodType: dto.bloodType || null,
          address: dto.address || null,
        },
      });

      let enrollment: any = null;
      if (dto.groupId) {
        enrollment = await tx.enrollment.create({
          data: {
            studentProfileId: studentProfile.id,
            groupId: dto.groupId,
            status: EnrollmentStatus.ACTIVE,
          },
        });
      }

      return {
        ...user,
        studentProfile: {
          ...studentProfile,
          enrollments: enrollment ? [enrollment] : [],
        },
      };
    });
  }

  async update(id: string, dto: UpdateStudentDto, currentUser: RequestUser) {
    const student = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Enforce boundary checks
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== student.schoolId
    ) {
      throw new ForbiddenException("Cannot modify this student's details");
    }

    const userUpdatePayload: any = {};
    if (dto.firstName !== undefined) userUpdatePayload.firstName = dto.firstName;
    if (dto.lastName !== undefined) userUpdatePayload.lastName = dto.lastName;
    if (dto.phone !== undefined) userUpdatePayload.phone = dto.phone;
    if (dto.active !== undefined) userUpdatePayload.active = dto.active;

    const profileUpdatePayload: any = {};
    if (dto.enrollmentNumber !== undefined) profileUpdatePayload.enrollmentNumber = dto.enrollmentNumber;
    if (dto.birthDate !== undefined) profileUpdatePayload.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.gender !== undefined) profileUpdatePayload.gender = dto.gender;
    if (dto.bloodType !== undefined) profileUpdatePayload.bloodType = dto.bloodType;
    if (dto.address !== undefined) profileUpdatePayload.address = dto.address;

    // Execute in transaction
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: userUpdatePayload,
      });

      const profile = await tx.studentProfile.update({
        where: { userId: id },
        data: profileUpdatePayload,
      });

      // Handle group enrollment updates
      if (dto.groupId !== undefined) {
        // Deactivate other active enrollments first
        await tx.enrollment.updateMany({
          where: {
            studentProfileId: profile.id,
            status: EnrollmentStatus.ACTIVE,
          },
          data: {
            status: EnrollmentStatus.INACTIVE,
          },
        });

        if (dto.groupId) {
          // Verify new group capacity & school boundary
          const group = await tx.group.findUnique({
            where: { id: dto.groupId },
          });
          if (!group) {
            throw new NotFoundException("Group not found");
          }
          if (group.schoolId !== student.schoolId) {
            throw new BadRequestException("Group does not belong to the student's school");
          }
          if (group.maxStudents !== null) {
            const activeCount = await tx.enrollment.count({
              where: { groupId: dto.groupId, status: EnrollmentStatus.ACTIVE },
            });
            if (activeCount >= group.maxStudents) {
              throw new BadRequestException(`Group "${group.name}" is already at full capacity (${group.maxStudents} students)`);
            }
          }

          // Create/Upsert the new enrollment
          await tx.enrollment.upsert({
            where: {
              studentProfileId_groupId: {
                studentProfileId: profile.id,
                groupId: dto.groupId,
              },
            },
            create: {
              studentProfileId: profile.id,
              groupId: dto.groupId,
              status: EnrollmentStatus.ACTIVE,
            },
            update: {
              status: EnrollmentStatus.ACTIVE,
            },
          });
        }
      }

      const activeEnrollments = await tx.enrollment.findMany({
        where: {
          studentProfileId: profile.id,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              grade: { select: { name: true } },
              schoolYear: { select: { name: true, active: true } },
            },
          },
        },
      });

      return {
        ...user,
        studentProfile: {
          ...profile,
          enrollments: activeEnrollments,
        },
      };
    });

    // Sync user metadata & status to Supabase Auth if needed
    const supabaseMetadata: any = {};
    if (dto.firstName !== undefined) supabaseMetadata.firstName = dto.firstName;
    if (dto.lastName !== undefined) supabaseMetadata.lastName = dto.lastName;

    const supabaseUpdatePayload: any = {};
    if (Object.keys(supabaseMetadata).length > 0) {
      supabaseUpdatePayload.user_metadata = {
        role: UserRole.STUDENT,
        schoolId: student.schoolId,
        firstName: dto.firstName ?? student.firstName,
        lastName: dto.lastName ?? student.lastName,
      };
    }

    if (dto.active !== undefined) {
      supabaseUpdatePayload.app_metadata = {
        suspended: !dto.active,
      };
    }

    if (Object.keys(supabaseUpdatePayload).length > 0) {
      const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(
        student.supabaseUid,
        supabaseUpdatePayload,
      );
      if (authError) {
        console.error("Failed to sync updated student credentials to Supabase:", authError);
      }
    }

    return updatedUser;
  }

  async delete(id: string, currentUser: RequestUser) {
    const student = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
      },
      include: {
        studentProfile: true,
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Enforce boundary checks
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.schoolId !== student.schoolId
    ) {
      throw new ForbiddenException("Cannot delete this student");
    }

    const profileId = student.studentProfile?.id;
    if (profileId) {
      // Check for academic history
      const attendanceCount = await this.prisma.attendance.count({
        where: { studentProfileId: profileId },
      });
      const gradeRecordsCount = await this.prisma.gradeRecord.count({
        where: { studentProfileId: profileId },
      });
      const taskDeliveriesCount = await this.prisma.taskDelivery.count({
        where: { studentProfileId: profileId },
      });

      if (attendanceCount > 0 || gradeRecordsCount > 0 || taskDeliveriesCount > 0) {
        throw new BadRequestException(
          `Cannot delete student because they have academic records: ${attendanceCount} attendance logs, ${gradeRecordsCount} grades, ${taskDeliveriesCount} task submissions. Deactivate their profile instead.`,
        );
      }
    }

    // Delete student in local DB and Supabase Auth
    await this.prisma.$transaction(async (tx) => {
      if (profileId) {
        // Delete enrollments
        await tx.enrollment.deleteMany({
          where: { studentProfileId: profileId },
        });

        // Delete parent links
        await tx.parentStudent.deleteMany({
          where: { studentProfileId: profileId },
        });

        // Delete student profile
        await tx.studentProfile.delete({
          where: { id: profileId },
        });
      }

      // Delete user
      await tx.user.delete({
        where: { id },
      });
    });

    // Delete from Supabase Auth
    const { error: authError } = await this.supabaseAdmin.auth.admin.deleteUser(
      student.supabaseUid,
    );
    if (authError) {
      console.error("Failed to delete user from Supabase Auth during student deletion:", authError);
    }

    return { id, email: student.email, success: true };
  }
}
