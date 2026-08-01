import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, UserRole } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { CreateParentDto, UpdateParentDto, LinkStudentDto } from "./parents.dto";
import { RequestUser } from "../../common/types";

@Injectable()
export class ParentsService {
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
    const targetSchoolId = (currentUser.role === UserRole.SUPER_ADMIN ? schoolIdFilter : (currentUser.activeSchoolId || currentUser.schoolId)) as string;

    const whereClause: any = {
      role: UserRole.PARENT,
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
        parentProfile: {
          include: {
            studentLinks: {
              include: {
                studentProfile: {
                  include: {
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, currentUser: RequestUser) {
    const targetSchoolId = (currentUser.activeSchoolId || currentUser.schoolId) as string;

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        parentProfile: {
          include: {
            studentLinks: {
              include: {
                studentProfile: {
                  include: {
                    user: { select: { firstName: true, lastName: true } }
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!user || user.role !== UserRole.PARENT) {
      throw new NotFoundException("Parent not found");
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN && user.schoolId !== targetSchoolId) {
      throw new NotFoundException("Parent not found in your school");
    }

    return user;
  }

  async create(dto: CreateParentDto, currentUser: RequestUser) {
    const schoolId = (currentUser.activeSchoolId || currentUser.schoolId) as string;

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, schoolId, role: UserRole.PARENT },
    });

    if (existingUser) {
      throw new ConflictException("A parent with this email already exists in this school");
    }

    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(dto.email, {
      data: { 
        schoolId, 
        role: UserRole.PARENT, 
        firstName: dto.firstName, 
        lastName: dto.lastName 
      },
    });

    if (authError || !authData?.user) {
      throw new BadRequestException(`Error inviting user to Supabase: ${authError?.message}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          supabaseUid: authData.user.id,
          email: dto.email,
          schoolId,
          role: UserRole.PARENT,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      const profile = await tx.parentProfile.create({
        data: {
          userId: newUser.id,
          occupation: dto.occupation,
        },
      });

      return { user: newUser, profile };
    });
  }

  async update(id: string, dto: UpdateParentDto, currentUser: RequestUser) {
    const parentUser = await this.findOne(id, currentUser);

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          active: dto.active,
        },
      });

      if (dto.occupation !== undefined && parentUser.parentProfile) {
        await tx.parentProfile.update({
          where: { id: parentUser.parentProfile.id },
          data: { occupation: dto.occupation },
        });
      }

      // Sync Supabase Metadata
      const metadataUpdates: any = {};
      if (dto.firstName) metadataUpdates.firstName = dto.firstName;
      if (dto.lastName) metadataUpdates.lastName = dto.lastName;

      if (Object.keys(metadataUpdates).length > 0) {
        await this.supabaseAdmin.auth.admin.updateUserById(parentUser.supabaseUid, {
          user_metadata: metadataUpdates,
        });
      }

      return updatedUser;
    });
  }

  async remove(id: string, currentUser: RequestUser) {
    const parentUser = await this.findOne(id, currentUser);

    return this.prisma.$transaction(async (tx) => {
      if (parentUser.parentProfile) {
        await tx.parentStudent.deleteMany({
          where: { parentProfileId: parentUser.parentProfile.id }
        });

        await tx.parentProfile.delete({
          where: { id: parentUser.parentProfile.id },
        });
      }

      await tx.user.delete({
        where: { id },
      });

      await this.supabaseAdmin.auth.admin.deleteUser(parentUser.supabaseUid);

      return { success: true };
    });
  }

  async linkStudent(parentId: string, dto: LinkStudentDto, currentUser: RequestUser) {
    const parentUser = await this.findOne(parentId, currentUser);
    if (!parentUser.parentProfile) {
      throw new BadRequestException("Parent profile is missing");
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentProfileId },
      include: { user: true }
    });

    if (!studentProfile) {
      throw new NotFoundException("Student not found");
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN && studentProfile.user.schoolId !== parentUser.schoolId) {
      throw new BadRequestException("Student belongs to a different school");
    }

    const existingLink = await this.prisma.parentStudent.findUnique({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: parentUser.parentProfile.id,
          studentProfileId: dto.studentProfileId
        }
      }
    });

    if (existingLink) {
      throw new ConflictException("Student is already linked to this parent");
    }

    return this.prisma.parentStudent.create({
      data: {
        parentProfileId: parentUser.parentProfile.id,
        studentProfileId: dto.studentProfileId,
        relationship: dto.relationship,
        isPrimary: dto.isPrimary ?? false,
      }
    });
  }

  async unlinkStudent(parentId: string, studentProfileId: string, currentUser: RequestUser) {
    const parentUser = await this.findOne(parentId, currentUser);
    if (!parentUser.parentProfile) {
      throw new BadRequestException("Parent profile is missing");
    }

    const existingLink = await this.prisma.parentStudent.findUnique({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: parentUser.parentProfile.id,
          studentProfileId,
        }
      }
    });

    if (!existingLink) {
      throw new NotFoundException("Link not found");
    }

    return this.prisma.parentStudent.delete({
      where: {
        parentProfileId_studentProfileId: {
          parentProfileId: parentUser.parentProfile.id,
          studentProfileId,
        }
      }
    });
  }
}
