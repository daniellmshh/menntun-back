import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "../../lib/prisma";
import {
  CreateGradeDto,
  UpdateGradeDto,
  CreateGroupDto,
  UpdateGroupDto,
  AssignGroupTeacherDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignSubjectTeacherDto,
  CreateSchoolYearDto,
  UpdateSchoolYearDto,
  CreatePeriodDto,
  UpdatePeriodDto,
} from "./academic.dto";
import { RequestUser } from "../../common/types";
import { UserRole } from "@prisma/client";

@Injectable()
export class AcademicService {
  // ─── PRIVATE HELPERS ───────────────────────────────────────────────

  
  private validatePeriods(yearStart: Date, yearEnd: Date, periods: { id?: string, name: string, startDate: Date, endDate: Date }[]) {
    for (const p of periods) {
      if (p.startDate >= p.endDate) {
        throw new BadRequestException(`Period "${p.name}" start date must be before its end date`);
      }
      
      const pStart = new Date(p.startDate.getFullYear(), p.startDate.getMonth(), p.startDate.getDate()).getTime();
      const pEnd = new Date(p.endDate.getFullYear(), p.endDate.getMonth(), p.endDate.getDate()).getTime();
      const yStart = new Date(yearStart.getFullYear(), yearStart.getMonth(), yearStart.getDate()).getTime();
      const yEnd = new Date(yearEnd.getFullYear(), yearEnd.getMonth(), yearEnd.getDate()).getTime();

      if (pStart < yStart || pEnd > yEnd) {
        throw new BadRequestException(`Period "${p.name}" dates must be within the school year dates`);
      }
    }

    const sorted = [...periods].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = new Date(sorted[i].endDate.getFullYear(), sorted[i].endDate.getMonth(), sorted[i].endDate.getDate()).getTime();
      const nextStart = new Date(sorted[i+1].startDate.getFullYear(), sorted[i+1].startDate.getMonth(), sorted[i+1].startDate.getDate()).getTime();
      if (currentEnd > nextStart) {
        throw new BadRequestException(`Periods "${sorted[i].name}" and "${sorted[i+1].name}" overlap`);
      }
    }
  }

  private requireAdmin(user: RequestUser) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException("Only administrators can perform this action");
    }
  }

  private async findGradeOrFail(id: string, schoolIdOrUser: string | RequestUser) {
    const grade = await prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException("Grade not found");
    }
    if (typeof schoolIdOrUser === "string") {
      if (grade.schoolId !== schoolIdOrUser) {
        throw new NotFoundException("Grade not found");
      }
    } else {
      if (schoolIdOrUser.role !== UserRole.SUPER_ADMIN && grade.schoolId !== schoolIdOrUser.schoolId) {
        throw new ForbiddenException("Access denied to this grade");
      }
    }
    return grade;
  }

  private async findGroupOrFail(id: string, schoolIdOrUser: string | RequestUser) {
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException("Group not found");
    }
    if (typeof schoolIdOrUser === "string") {
      if (group.schoolId !== schoolIdOrUser) {
        throw new NotFoundException("Group not found");
      }
    } else {
      if (schoolIdOrUser.role !== UserRole.SUPER_ADMIN && group.schoolId !== schoolIdOrUser.schoolId) {
        throw new ForbiddenException("Access denied to this group");
      }
    }
    return group;
  }

  private async findSubjectOrFail(id: string, schoolId: string) {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.schoolId !== schoolId) {
      throw new NotFoundException("Subject not found");
    }
    return subject;
  }

  // ─── GRADES METHODS ────────────────────────────────────────────────

  async findAllGrades(schoolId: string, user?: RequestUser) {
    const targetSchoolId = (user && user.role === UserRole.SUPER_ADMIN)
      ? (schoolId || user.schoolId)
      : (user?.schoolId || schoolId);

    return prisma.grade.findMany({
      where: { schoolId: targetSchoolId as string as string },
      orderBy: { order: "asc" },
      include: {
        school: { select: { name: true, code: true } },
        _count: {
          select: { groups: true },
        },
      },
    });
  }

  async findAllGradesAllSchools(user: RequestUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only Super Admins can view all grades");
    }
    return prisma.grade.findMany({
      orderBy: [{ schoolId: "asc" }, { order: "asc" }],
      include: {
        school: { select: { name: true, code: true } },
        _count: { select: { groups: true } },
      },
    });
  }

  async createGrade(schoolId: string, dto: CreateGradeDto, user: RequestUser) {
    this.requireAdmin(user);

    const targetSchoolId = user.role === UserRole.SUPER_ADMIN
      ? (dto.schoolId || schoolId)
      : schoolId;

    const level = dto.level || null;
    const existing = await prisma.grade.findFirst({
      where: {
        schoolId: targetSchoolId as string,
        name: dto.name,
        level: level,
      },
    });

    if (existing) {
      throw new ConflictException(`Grade "${dto.name}" with level "${level || 'N/A'}" already exists in this school`);
    }

    return prisma.grade.create({
      data: {
        name: dto.name,
        order: dto.order,
        level: dto.level,
        schoolId: targetSchoolId as string,
      },
    });
  }

  async updateGrade(id: string, dto: UpdateGradeDto, user: RequestUser) {
    this.requireAdmin(user);
    const grade = await this.findGradeOrFail(id, user);

    if (dto.name !== undefined || dto.level !== undefined) {
      const newName = dto.name !== undefined ? dto.name : grade.name;
      const newLevel = dto.level !== undefined ? dto.level : grade.level;

      const existing = await prisma.grade.findFirst({
        where: {
          schoolId: grade.schoolId,
          name: newName,
          level: newLevel || null,
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Grade "${newName}" with level "${newLevel || 'N/A'}" already exists in this school`);
      }
    }

    return prisma.grade.update({
      where: { id },
      data: {
        name: dto.name,
        order: dto.order,
        level: dto.level,
      },
    });
  }

  async deleteGrade(id: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findGradeOrFail(id, user);

    const groupsCount = await prisma.group.count({
      where: { gradeId: id },
    });

    if (groupsCount > 0) {
      throw new BadRequestException("Cannot delete grade because it has active classroom groups");
    }

    await prisma.grade.delete({ where: { id } });
    return { message: "Grade deleted successfully" };
  }

  // ─── SCHOOL YEARS METHODS ──────────────────────────────────────────────

  async findAllSchoolYears(schoolId: string, user: RequestUser) {
    const scopedSchoolId = user.role === UserRole.SUPER_ADMIN
      ? (schoolId || user.schoolId)
      : user.schoolId;

    return prisma.schoolYear.findMany({
      where: { schoolId: scopedSchoolId as string },
      orderBy: { startDate: "desc" },
      include: {
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });
  }

  async findAllSchoolYearsAllSchools(user: RequestUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only Super Admins can view all school years across schools");
    }
    return prisma.schoolYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        school: { select: { name: true, code: true } },
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });
  }

  async findSchoolYearById(id: string, user: RequestUser) {
    const year = await prisma.schoolYear.findUnique({
      where: { id },
      include: {
        school: { select: { name: true, code: true } },
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });
    if (!year) throw new NotFoundException("School year not found");
    if (user.role !== UserRole.SUPER_ADMIN && year.schoolId !== user.schoolId) {
      throw new ForbiddenException("Access denied");
    }
    return year;
  }

  async findActiveSchoolYear(schoolId: string) {
    const activeYear = await prisma.schoolYear.findFirst({
      where: { schoolId, active: true },
      include: {
        periods: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!activeYear) {
      throw new NotFoundException("No active school year found");
    }

    return activeYear;
  }

  async createSchoolYear(dto: CreateSchoolYearDto, user: RequestUser) {
    this.requireAdmin(user);

    const targetSchoolId = (user.role === UserRole.SUPER_ADMIN && dto.schoolId)
      ? dto.schoolId
      : user.schoolId;

    // Validate school exists and user has access
    if (user.role === UserRole.SUPER_ADMIN && dto.schoolId) {
      const school = await prisma.school.findUnique({ where: { id: dto.schoolId } });
      if (!school) throw new NotFoundException("School not found");
    }

    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException("Start date must be before end date");
    }

    const created = await prisma.schoolYear.create({
      data: {
        schoolId: targetSchoolId as string,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        active: true,
        ...(dto.periods && dto.periods.length > 0
          ? {
              periods: {
                create: dto.periods.map((p) => ({
                  name: p.name,
                  startDate: new Date(p.startDate),
                  endDate: new Date(p.endDate),
                  order: p.order,
                })),
              },
            }
          : {}),
      },
      include: {
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });

    return created;
  }

  async updateSchoolYear(id: string, dto: UpdateSchoolYearDto, user: RequestUser) {
    this.requireAdmin(user);
    const year = await this.findSchoolYearById(id, user);

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException("Start date must be before end date");
      }
    } else if (dto.startDate) {
      if (new Date(dto.startDate) >= year.endDate) {
        throw new BadRequestException("Start date must be before end date");
      }
    } else if (dto.endDate) {
      if (year.startDate >= new Date(dto.endDate)) {
        throw new BadRequestException("End date must be after start date");
      }
    }

    return prisma.schoolYear.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: {
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });
  }

  async closeSchoolYear(id: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSchoolYearById(id, user);

    return prisma.schoolYear.update({
      where: { id },
      data: { active: false },
      include: {
        periods: { orderBy: { order: "asc" } },
        _count: { select: { groups: true } },
      },
    });
  }

  async deleteSchoolYear(id: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSchoolYearById(id, user);

    const groupsCount = await prisma.group.count({ where: { schoolYearId: id } });
    if (groupsCount > 0) {
      throw new BadRequestException("Cannot delete school year because it has assigned groups. Close it instead.");
    }

    // Delete periods first, then the school year
    await prisma.period.deleteMany({ where: { schoolYearId: id } });
    await prisma.schoolYear.delete({ where: { id } });
    return { message: "School year deleted successfully" };
  }

  // ─── PERIODS METHODS ──────────────────────────────────────────────────

  async addPeriod(schoolYearId: string, dto: CreatePeriodDto, user: RequestUser) {
    this.requireAdmin(user);
    const year = await this.findSchoolYearById(schoolYearId, user);
    
    const newPeriod = {
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate)
    };
    
    const existingPeriods = await prisma.period.findMany({ where: { schoolYearId } });
    this.validatePeriods(year.startDate, year.endDate, [...existingPeriods, newPeriod]);

    return prisma.period.create({
      data: {
        schoolYearId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        order: dto.order,
      },
    });
  }

  async updatePeriod(schoolYearId: string, periodId: string, dto: UpdatePeriodDto, user: RequestUser) {
    this.requireAdmin(user);
    const year = await this.findSchoolYearById(schoolYearId, user);
    
    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period || period.schoolYearId !== schoolYearId) {
      throw new NotFoundException("Period not found");
    }

    const existingPeriods = await prisma.period.findMany({ where: { schoolYearId } });
    const updatedPeriods = existingPeriods.map(p => {
      if (p.id === periodId) {
        return {
          id: p.id,
          name: dto.name !== undefined ? dto.name : p.name,
          startDate: dto.startDate !== undefined ? new Date(dto.startDate) : p.startDate,
          endDate: dto.endDate !== undefined ? new Date(dto.endDate) : p.endDate
        };
      }
      return p;
    });

    this.validatePeriods(year.startDate, year.endDate, updatedPeriods);

    return prisma.period.update({
      where: { id: periodId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });
  }

  async deletePeriod(schoolYearId: string, periodId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSchoolYearById(schoolYearId, user);

    const period = await prisma.period.findUnique({ where: { id: periodId } });
    if (!period || period.schoolYearId !== schoolYearId) {
      throw new NotFoundException("Period not found");
    }

    const gradesCount = await prisma.gradeRecord.count({ where: { periodId } });
    if (gradesCount > 0) {
      throw new BadRequestException("Cannot delete period because it has grade records associated");
    }

    await prisma.period.delete({ where: { id: periodId } });
    return { message: "Period deleted successfully" };
  }

  // ─── GROUPS METHODS ────────────────────────────────────────────────

  async findAllGroups(schoolId: string, schoolYearId?: string, user?: RequestUser, assignedToMe = false) {
    const targetSchoolId = (user && user.role === UserRole.SUPER_ADMIN)
      ? (schoolId || user.schoolId)
      : (user?.schoolId || schoolId);
    const teacherGroupIds = assignedToMe && user?.role === UserRole.TEACHER
      ? (await prisma.subjectTeacher.findMany({
          where: { teacherProfile: { userId: user.id } },
          select: { groupId: true },
        })).map(({ groupId }) => groupId)
      : undefined;

    return prisma.group.findMany({
      where: {
        schoolId: targetSchoolId as string,
        ...(schoolYearId ? { schoolYearId } : {}),
        ...(teacherGroupIds ? { id: { in: teacherGroupIds } } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        grade: {
          select: { name: true, level: true },
        },
        schoolYear: {
          select: {
            name: true,
            active: true,
            periods: {
              select: { id: true, name: true, startDate: true, endDate: true },
              orderBy: { startDate: "asc" },
            },
          },
        },
        school: { select: { name: true, code: true } },
        _count: {
          select: { enrollments: true, teachers: true },
        },
      },
    });
  }

  async findAllGroupsAllSchools(user: RequestUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only Super Admins can view all groups across schools");
    }
    return prisma.group.findMany({
      orderBy: [{ schoolId: "asc" }, { name: "asc" }],
      include: {
        grade: { select: { name: true, level: true } },
        schoolYear: { select: { name: true, active: true } },
        school: { select: { name: true, code: true } },
        _count: { select: { enrollments: true, teachers: true } },
      },
    });
  }

  async findGroupById(id: string, user: RequestUser) {
    await this.findGroupOrFail(id, user);

    return prisma.group.findUnique({
      where: { id },
      include: {
        grade: true,
        schoolYear: true,
        school: { select: { name: true, code: true } },
        teachers: {
          include: {
            teacherProfile: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async createGroup(schoolId: string, dto: CreateGroupDto, user: RequestUser) {
    this.requireAdmin(user);

    const targetSchoolId = user.role === UserRole.SUPER_ADMIN
      ? (dto.schoolId || schoolId)
      : schoolId;

    // Validate grade and year belong to this school
    const grade = await prisma.grade.findUnique({ where: { id: dto.gradeId } });
    if (!grade || grade.schoolId !== targetSchoolId) {
      throw new NotFoundException("Grade not found");
    }
    const year = await prisma.schoolYear.findUnique({ where: { id: dto.schoolYearId } });
    if (!year || year.schoolId !== targetSchoolId) {
      throw new NotFoundException("School year not found");
    }
    if (!year.active) {
      throw new BadRequestException("Cannot create group for a closed school year");
    }

    const existing = await prisma.group.findUnique({
      where: {
        schoolId_gradeId_schoolYearId_name: {
          schoolId: targetSchoolId as string,
          gradeId: dto.gradeId,
          schoolYearId: dto.schoolYearId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Group "${dto.name}" already exists for this grade and year`);
    }

    return prisma.group.create({
      data: {
        name: dto.name,
        gradeId: dto.gradeId,
        schoolYearId: dto.schoolYearId,
        maxStudents: dto.maxStudents,
        schoolId: targetSchoolId as string,
      },
      include: {
        grade: { select: { name: true, level: true } },
        schoolYear: { select: { name: true, active: true } },
      },
    });
  }

  async updateGroup(id: string, dto: UpdateGroupDto, user: RequestUser) {
    this.requireAdmin(user);
    const group = await prisma.group.findUnique({
      where: { id },
      include: { schoolYear: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.schoolId !== user.schoolId && user.role !== UserRole.SUPER_ADMIN && user.activeSchoolId !== group.schoolId) {
      throw new ForbiddenException("Access denied to this group");
    }
    if (!group.schoolYear.active) {
      throw new BadRequestException("Cannot modify groups of a closed school year");
    }

    if (dto.gradeId) {
      const targetGrade = await prisma.grade.findUnique({ where: { id: dto.gradeId } });
      if (!targetGrade || targetGrade.schoolId !== group.schoolId) {
        throw new NotFoundException("Grade not found for this school");
      }
    }

    const checkGradeId = dto.gradeId ?? group.gradeId;
    const checkName = dto.name ?? group.name;

    if (dto.gradeId || dto.name) {
      const existing = await prisma.group.findUnique({
        where: {
          schoolId_gradeId_schoolYearId_name: {
            schoolId: group.schoolId,
            gradeId: checkGradeId,
            schoolYearId: group.schoolYearId,
            name: checkName,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Group "${checkName}" already exists for this grade and year`);
      }
    }

    return prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        gradeId: dto.gradeId,
        maxStudents: dto.maxStudents,
      },
      include: {
        grade: { select: { name: true, level: true } },
        schoolYear: { select: { name: true, active: true } },
      },
    });
  }

  async removeGroup(id: string, user: RequestUser) {
    this.requireAdmin(user);
    const group = await prisma.group.findUnique({
      where: { id },
      include: { 
        schoolYear: true,
        _count: {
          select: { enrollments: true }
        }
      },
    });
    
    if (!group) throw new NotFoundException("Group not found");
    if (group.schoolId !== user.schoolId && user.role !== UserRole.SUPER_ADMIN && user.activeSchoolId !== group.schoolId) {
      throw new ForbiddenException("Access denied to this group");
    }
    
    if (!group.schoolYear.active) {
      throw new BadRequestException("Cannot delete groups of a closed school year");
    }
    
    if (group._count.enrollments > 0) {
      throw new BadRequestException("Cannot delete group because it has enrolled students");
    }

    await prisma.group.delete({ where: { id } });
    return { message: "Group deleted successfully" };
  }

  async assignGroupTeacher(id: string, dto: AssignGroupTeacherDto, user: RequestUser) {
    this.requireAdmin(user);
    const group = await this.findGroupOrFail(id, user);

    // Verify teacher profile exists and belongs to this school
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: dto.teacherProfileId },
      include: { user: true },
    });

    if (!teacher || teacher.user.schoolId !== group.schoolId) {
      throw new NotFoundException("Teacher profile not found");
    }

    const existing = await prisma.groupTeacher.findUnique({
      where: {
        groupId_teacherProfileId: {
          groupId: id,
          teacherProfileId: dto.teacherProfileId,
        },
      },
    });

    if (existing) {
      throw new ConflictException("Teacher is already assigned to this group");
    }

    return prisma.groupTeacher.create({
      data: {
        groupId: id,
        teacherProfileId: dto.teacherProfileId,
        isHomeroom: dto.isHomeroom ?? false,
      },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async removeGroupTeacher(id: string, teacherProfileId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findGroupOrFail(id, user);

    try {
      await prisma.groupTeacher.delete({
        where: {
          groupId_teacherProfileId: {
            groupId: id,
            teacherProfileId,
          },
        },
      });
      return { message: "Teacher removed from group successfully" };
    } catch {
      throw new NotFoundException("Assignment not found");
    }
  }

  // ─── SUBJECTS METHODS ──────────────────────────────────────────────

  async findAllSubjects(schoolId: string) {
    return prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { teachers: true },
        },
      },
    });
  }

  async findSubjectById(id: string, schoolId: string) {
    await this.findSubjectOrFail(id, schoolId);

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        teachers: {
          include: {
            teacherProfile: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) return null;

    const groupIds = subject.teachers.map((t) => t.groupId);
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true },
    });

    const groupsMap = new Map(groups.map((g) => [g.id, g]));

    const teachersWithGroup = subject.teachers.map((t) => ({
      ...t,
      group: groupsMap.get(t.groupId) || null,
    }));

    return {
      ...subject,
      teachers: teachersWithGroup,
    };
  }

  async createSubject(schoolId: string, dto: CreateSubjectDto, user: RequestUser) {
    this.requireAdmin(user);

    const existing = await prisma.subject.findUnique({
      where: {
        schoolId_name: { schoolId, name: dto.name },
      },
    });

    if (existing) {
      throw new ConflictException(`Subject "${dto.name}" already exists in this school`);
    }

    return prisma.subject.create({
      data: { ...dto, schoolId },
    });
  }

  async updateSubject(id: string, schoolId: string, dto: UpdateSubjectDto, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSubjectOrFail(id, schoolId);

    if (dto.name) {
      const existing = await prisma.subject.findUnique({
        where: {
          schoolId_name: { schoolId, name: dto.name },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Subject "${dto.name}" already exists in this school`);
      }
    }

    return prisma.subject.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSubject(id: string, schoolId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSubjectOrFail(id, schoolId);

    const teachersCount = await prisma.subjectTeacher.count({
      where: { subjectId: id },
    });

    if (teachersCount > 0) {
      throw new BadRequestException("Cannot delete subject because it has active group assignments");
    }

    await prisma.subject.delete({ where: { id } });
    return { message: "Subject deleted successfully" };
  }

  async assignSubjectTeacher(id: string, schoolId: string, dto: AssignSubjectTeacherDto, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSubjectOrFail(id, schoolId);

    // Validate group and teacher belong to this school
    const group = await this.findGroupOrFail(dto.groupId, schoolId);
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: dto.teacherProfileId },
      include: { user: true },
    });

    if (!teacher || teacher.user.schoolId !== schoolId) {
      throw new NotFoundException("Teacher profile not found");
    }

    const existing = await prisma.subjectTeacher.findUnique({
      where: {
        subjectId_teacherProfileId_groupId: {
          subjectId: id,
          teacherProfileId: dto.teacherProfileId,
          groupId: dto.groupId,
        },
      },
    });

    if (existing) {
      throw new ConflictException("Teacher is already assigned to this subject for this group");
    }

    const created = await prisma.subjectTeacher.create({
      data: {
        subjectId: id,
        teacherProfileId: dto.teacherProfileId,
        groupId: dto.groupId,
      },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return {
      ...created,
      group: {
        name: group.name,
      },
    };
  }

  async removeSubjectTeacher(id: string, teacherProfileId: string, groupId: string, schoolId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findSubjectOrFail(id, schoolId);

    try {
      await prisma.subjectTeacher.delete({
        where: {
          subjectId_teacherProfileId_groupId: {
            subjectId: id,
            teacherProfileId,
            groupId,
          },
        },
      });
      return { message: "Teacher removed from subject assignment successfully" };
    } catch {
      throw new NotFoundException("Assignment not found");
    }
  }

  // ─── GROUP SUBJECTS METHODS ─────────────────────────────────────────

  async getGroupSubjects(groupId: string, user: RequestUser) {
    await this.findGroupOrFail(groupId, user);

    // Get all subjects of the school + whether they are assigned to this group (via subject_teachers)
    const schoolId = (user.activeSchoolId || user.schoolId) as string;

    const [allSubjects, groupAssignments] = await Promise.all([
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      }),
      prisma.subjectTeacher.findMany({
        where: { groupId },
        include: {
          teacherProfile: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
          subject: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const assignmentMap = new Map(groupAssignments.map((a) => [a.subjectId, a]));

    return allSubjects.map((s) => {
      const assignment = assignmentMap.get(s.id);
      return {
        ...s,
        assigned: !!assignment,
        assignmentId: assignment?.id ?? null,
        teacher: assignment?.teacherProfile ?? null,
      };
    });
  }

  async assignGroupSubject(groupId: string, dto: { subjectId: string; teacherProfileId?: string }, user: RequestUser) {
    this.requireAdmin(user);
    const group = await this.findGroupOrFail(groupId, user);
    const schoolId = group.schoolId;

    await this.findSubjectOrFail(dto.subjectId, schoolId);

    if (dto.teacherProfileId) {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: dto.teacherProfileId },
        include: { user: true },
      });
      if (!teacher || teacher.user.schoolId !== schoolId) {
        throw new NotFoundException("Teacher profile not found");
      }

      const existing = await prisma.subjectTeacher.findUnique({
        where: {
          subjectId_teacherProfileId_groupId: {
            subjectId: dto.subjectId,
            teacherProfileId: dto.teacherProfileId,
            groupId,
          },
        },
      });
      if (existing) {
        throw new ConflictException("This teacher is already assigned to this subject for this group");
      }

      return prisma.subjectTeacher.create({
        data: { subjectId: dto.subjectId, teacherProfileId: dto.teacherProfileId, groupId },
        include: {
          subject: true,
          teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
    }

    // If no teacher provided, just check if already assigned (any teacher)
    const anyExisting = await prisma.subjectTeacher.findFirst({
      where: { subjectId: dto.subjectId, groupId },
    });
    if (anyExisting) {
      throw new ConflictException("Subject is already assigned to this group");
    }

    // We need at least homeroom teacher to auto-assign
    const homeroomTeacher = await prisma.groupTeacher.findFirst({
      where: { groupId, isHomeroom: true },
    });
    if (!homeroomTeacher) {
      throw new BadRequestException("Cannot assign subject without a teacher. Please assign a homeroom teacher to the group first, or specify a teacher for this subject.");
    }

    return prisma.subjectTeacher.create({
      data: { subjectId: dto.subjectId, teacherProfileId: homeroomTeacher.teacherProfileId, groupId },
      include: {
        subject: true,
        teacherProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async removeGroupSubject(groupId: string, subjectId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findGroupOrFail(groupId, user);

    const deleted = await prisma.subjectTeacher.deleteMany({
      where: { groupId, subjectId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException("Subject assignment not found for this group");
    }

    return { message: "Subject removed from group successfully" };
  }

  async getGroupAvailableStudents(groupId: string, user: RequestUser) {
    const group = await this.findGroupOrFail(groupId, user);
    const schoolId = group.schoolId;

    // Get all active students of the school
    // "available" = not enrolled in any group of the same school_year
    const alreadyEnrolledStudentIds = await prisma.enrollment.findMany({
      where: {
        group: { schoolYearId: group.schoolYearId, schoolId },
        status: "ACTIVE",
      },
      select: { studentProfileId: true },
    });

    const enrolledIds = alreadyEnrolledStudentIds.map((e) => e.studentProfileId);

    // Students in current group (already assigned)
    const groupEnrollments = await prisma.enrollment.findMany({
      where: { groupId, status: "ACTIVE" },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    const available = await prisma.studentProfile.findMany({
      where: {
        user: { schoolId, active: true },
        id: { notIn: enrolledIds },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [
        { user: { lastName: "asc" } },
        { user: { firstName: "asc" } },
      ],
    });

    return {
      assigned: groupEnrollments.map((e) => ({
        enrollmentId: e.id,
        studentProfileId: e.studentProfileId,
        enrollmentNumber: e.studentProfile.enrollmentNumber,
        firstName: e.studentProfile.user.firstName,
        lastName: e.studentProfile.user.lastName,
        email: e.studentProfile.user.email,
      })),
      available: available.map((s) => ({
        studentProfileId: s.id,
        enrollmentNumber: s.enrollmentNumber,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        email: s.user.email,
      })),
    };
  }

  async bulkAssignStudents(
    groupId: string,
    students: { enrollmentNumber: string }[],
    user: RequestUser,
  ) {
    this.requireAdmin(user);
    const group = await this.findGroupOrFail(groupId, user);
    const schoolId = group.schoolId;

    const results: { enrollmentNumber: string; status: "success" | "error"; message: string }[] = [];

    for (const { enrollmentNumber } of students) {
      try {
        const studentProfile = await prisma.studentProfile.findFirst({
          where: {
            enrollmentNumber,
            user: { schoolId },
          },
          include: { user: true },
        });

        if (!studentProfile) {
          results.push({ enrollmentNumber, status: "error", message: "Student not found" });
          continue;
        }

        // Check max capacity
        if (group.maxStudents) {
          const currentCount = await prisma.enrollment.count({
            where: { groupId, status: "ACTIVE" },
          });
          if (currentCount >= group.maxStudents) {
            results.push({ enrollmentNumber, status: "error", message: "Group is at maximum capacity" });
            continue;
          }
        }

        // Check already enrolled in this group
        const existingInGroup = await prisma.enrollment.findFirst({
          where: { groupId, studentProfileId: studentProfile.id, status: "ACTIVE" },
        });
        if (existingInGroup) {
          results.push({ enrollmentNumber, status: "error", message: "Already enrolled in this group" });
          continue;
        }

        // Check if enrolled in another group of same year — move them
        const existingOtherGroup = await prisma.enrollment.findFirst({
          where: {
            studentProfileId: studentProfile.id,
            group: { schoolYearId: group.schoolYearId },
            status: "ACTIVE",
          },
        });

        if (existingOtherGroup) {
          // Update to new group
          await prisma.enrollment.update({
            where: { id: existingOtherGroup.id },
            data: { groupId },
          });
        } else {
          await prisma.enrollment.create({
            data: {
              studentProfileId: studentProfile.id,
              groupId,
              status: "ACTIVE",
              enrolledAt: new Date(),
            },
          });
        }

        results.push({
          enrollmentNumber,
          status: "success",
          message: `${studentProfile.user.firstName} ${studentProfile.user.lastName} assigned successfully`,
        });
      } catch (err) {
        results.push({ enrollmentNumber, status: "error", message: "Unexpected error processing this student" });
      }
    }

    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;

    return { results, summary: { total: students.length, successful, failed } };
  }

  async removeStudentFromGroup(groupId: string, studentProfileId: string, user: RequestUser) {
    this.requireAdmin(user);
    await this.findGroupOrFail(groupId, user);

    const enrollment = await prisma.enrollment.findFirst({
      where: { groupId, studentProfileId, status: "ACTIVE" },
    });

    if (!enrollment) {
      throw new NotFoundException("Student enrollment not found in this group");
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "INACTIVE" },
    });

    return { message: "Student removed from group successfully" };
  }
}
