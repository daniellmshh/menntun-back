"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
let AcademicService = class AcademicService {
    requireAdmin(user) {
        if (user.role !== client_1.UserRole.SUPER_ADMIN && user.role !== client_1.UserRole.SCHOOL_ADMIN) {
            throw new common_1.ForbiddenException("Only administrators can perform this action");
        }
    }
    async findGradeOrFail(id, schoolIdOrUser) {
        const grade = await prisma_1.prisma.grade.findUnique({ where: { id } });
        if (!grade) {
            throw new common_1.NotFoundException("Grade not found");
        }
        if (typeof schoolIdOrUser === "string") {
            if (grade.schoolId !== schoolIdOrUser) {
                throw new common_1.NotFoundException("Grade not found");
            }
        }
        else {
            if (schoolIdOrUser.role !== client_1.UserRole.SUPER_ADMIN && grade.schoolId !== schoolIdOrUser.schoolId) {
                throw new common_1.ForbiddenException("Access denied to this grade");
            }
        }
        return grade;
    }
    async findGroupOrFail(id, schoolIdOrUser) {
        const group = await prisma_1.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new common_1.NotFoundException("Group not found");
        }
        if (typeof schoolIdOrUser === "string") {
            if (group.schoolId !== schoolIdOrUser) {
                throw new common_1.NotFoundException("Group not found");
            }
        }
        else {
            if (schoolIdOrUser.role !== client_1.UserRole.SUPER_ADMIN && group.schoolId !== schoolIdOrUser.schoolId) {
                throw new common_1.ForbiddenException("Access denied to this group");
            }
        }
        return group;
    }
    async findSubjectOrFail(id, schoolId) {
        const subject = await prisma_1.prisma.subject.findUnique({ where: { id } });
        if (!subject || subject.schoolId !== schoolId) {
            throw new common_1.NotFoundException("Subject not found");
        }
        return subject;
    }
    async findAllGrades(schoolId, user) {
        const targetSchoolId = (user && user.role === client_1.UserRole.SUPER_ADMIN)
            ? (schoolId || user.schoolId)
            : (user?.schoolId || schoolId);
        return prisma_1.prisma.grade.findMany({
            where: { schoolId: targetSchoolId },
            orderBy: { order: "asc" },
            include: {
                school: { select: { name: true, code: true } },
                _count: {
                    select: { groups: true },
                },
            },
        });
    }
    async findAllGradesAllSchools(user) {
        if (user.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException("Only Super Admins can view all grades");
        }
        return prisma_1.prisma.grade.findMany({
            orderBy: [{ schoolId: "asc" }, { order: "asc" }],
            include: {
                school: { select: { name: true, code: true } },
                _count: { select: { groups: true } },
            },
        });
    }
    async createGrade(schoolId, dto, user) {
        this.requireAdmin(user);
        const targetSchoolId = user.role === client_1.UserRole.SUPER_ADMIN
            ? (dto.schoolId || schoolId)
            : schoolId;
        const existing = await prisma_1.prisma.grade.findUnique({
            where: {
                schoolId_name: { schoolId: targetSchoolId, name: dto.name },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Grade "${dto.name}" already exists in this school`);
        }
        return prisma_1.prisma.grade.create({
            data: {
                name: dto.name,
                order: dto.order,
                level: dto.level,
                schoolId: targetSchoolId,
            },
        });
    }
    async updateGrade(id, dto, user) {
        this.requireAdmin(user);
        const grade = await this.findGradeOrFail(id, user);
        if (dto.name) {
            const existing = await prisma_1.prisma.grade.findUnique({
                where: {
                    schoolId_name: { schoolId: grade.schoolId, name: dto.name },
                },
            });
            if (existing && existing.id !== id) {
                throw new common_1.ConflictException(`Grade "${dto.name}" already exists in this school`);
            }
        }
        return prisma_1.prisma.grade.update({
            where: { id },
            data: {
                name: dto.name,
                order: dto.order,
                level: dto.level,
            },
        });
    }
    async deleteGrade(id, user) {
        this.requireAdmin(user);
        await this.findGradeOrFail(id, user);
        const groupsCount = await prisma_1.prisma.group.count({
            where: { gradeId: id },
        });
        if (groupsCount > 0) {
            throw new common_1.BadRequestException("Cannot delete grade because it has active classroom groups");
        }
        await prisma_1.prisma.grade.delete({ where: { id } });
        return { message: "Grade deleted successfully" };
    }
    async findAllSchoolYears(schoolId, user) {
        const scopedSchoolId = user.role === client_1.UserRole.SUPER_ADMIN
            ? (schoolId || user.schoolId)
            : user.schoolId;
        return prisma_1.prisma.schoolYear.findMany({
            where: { schoolId: scopedSchoolId },
            orderBy: { startDate: "desc" },
            include: {
                periods: { orderBy: { order: "asc" } },
                _count: { select: { groups: true } },
            },
        });
    }
    async findAllSchoolYearsAllSchools(user) {
        if (user.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException("Only Super Admins can view all school years across schools");
        }
        return prisma_1.prisma.schoolYear.findMany({
            orderBy: { startDate: "desc" },
            include: {
                school: { select: { name: true, code: true } },
                periods: { orderBy: { order: "asc" } },
                _count: { select: { groups: true } },
            },
        });
    }
    async findSchoolYearById(id, user) {
        const year = await prisma_1.prisma.schoolYear.findUnique({
            where: { id },
            include: {
                school: { select: { name: true, code: true } },
                periods: { orderBy: { order: "asc" } },
                _count: { select: { groups: true } },
            },
        });
        if (!year)
            throw new common_1.NotFoundException("School year not found");
        if (user.role !== client_1.UserRole.SUPER_ADMIN && year.schoolId !== user.schoolId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        return year;
    }
    async findActiveSchoolYear(schoolId) {
        const activeYear = await prisma_1.prisma.schoolYear.findFirst({
            where: { schoolId, active: true },
            include: {
                periods: {
                    orderBy: { order: "asc" },
                },
            },
        });
        if (!activeYear) {
            throw new common_1.NotFoundException("No active school year found");
        }
        return activeYear;
    }
    async createSchoolYear(dto, user) {
        this.requireAdmin(user);
        const targetSchoolId = (user.role === client_1.UserRole.SUPER_ADMIN && dto.schoolId)
            ? dto.schoolId
            : user.schoolId;
        if (user.role === client_1.UserRole.SUPER_ADMIN && dto.schoolId) {
            const school = await prisma_1.prisma.school.findUnique({ where: { id: dto.schoolId } });
            if (!school)
                throw new common_1.NotFoundException("School not found");
        }
        if (new Date(dto.startDate) >= new Date(dto.endDate)) {
            throw new common_1.BadRequestException("Start date must be before end date");
        }
        const created = await prisma_1.prisma.schoolYear.create({
            data: {
                schoolId: targetSchoolId,
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
    async updateSchoolYear(id, dto, user) {
        this.requireAdmin(user);
        const year = await this.findSchoolYearById(id, user);
        if (dto.startDate && dto.endDate) {
            if (new Date(dto.startDate) >= new Date(dto.endDate)) {
                throw new common_1.BadRequestException("Start date must be before end date");
            }
        }
        else if (dto.startDate) {
            if (new Date(dto.startDate) >= year.endDate) {
                throw new common_1.BadRequestException("Start date must be before end date");
            }
        }
        else if (dto.endDate) {
            if (year.startDate >= new Date(dto.endDate)) {
                throw new common_1.BadRequestException("End date must be after start date");
            }
        }
        return prisma_1.prisma.schoolYear.update({
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
    async closeSchoolYear(id, user) {
        this.requireAdmin(user);
        await this.findSchoolYearById(id, user);
        return prisma_1.prisma.schoolYear.update({
            where: { id },
            data: { active: false },
            include: {
                periods: { orderBy: { order: "asc" } },
                _count: { select: { groups: true } },
            },
        });
    }
    async deleteSchoolYear(id, user) {
        this.requireAdmin(user);
        await this.findSchoolYearById(id, user);
        const groupsCount = await prisma_1.prisma.group.count({ where: { schoolYearId: id } });
        if (groupsCount > 0) {
            throw new common_1.BadRequestException("Cannot delete school year because it has assigned groups. Close it instead.");
        }
        await prisma_1.prisma.period.deleteMany({ where: { schoolYearId: id } });
        await prisma_1.prisma.schoolYear.delete({ where: { id } });
        return { message: "School year deleted successfully" };
    }
    async addPeriod(schoolYearId, dto, user) {
        this.requireAdmin(user);
        await this.findSchoolYearById(schoolYearId, user);
        if (new Date(dto.startDate) >= new Date(dto.endDate)) {
            throw new common_1.BadRequestException("Period start date must be before end date");
        }
        return prisma_1.prisma.period.create({
            data: {
                schoolYearId,
                name: dto.name,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                order: dto.order,
            },
        });
    }
    async updatePeriod(schoolYearId, periodId, dto, user) {
        this.requireAdmin(user);
        await this.findSchoolYearById(schoolYearId, user);
        const period = await prisma_1.prisma.period.findUnique({ where: { id: periodId } });
        if (!period || period.schoolYearId !== schoolYearId) {
            throw new common_1.NotFoundException("Period not found");
        }
        return prisma_1.prisma.period.update({
            where: { id: periodId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
                ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
                ...(dto.order !== undefined ? { order: dto.order } : {}),
            },
        });
    }
    async deletePeriod(schoolYearId, periodId, user) {
        this.requireAdmin(user);
        await this.findSchoolYearById(schoolYearId, user);
        const period = await prisma_1.prisma.period.findUnique({ where: { id: periodId } });
        if (!period || period.schoolYearId !== schoolYearId) {
            throw new common_1.NotFoundException("Period not found");
        }
        const gradesCount = await prisma_1.prisma.gradeRecord.count({ where: { periodId } });
        if (gradesCount > 0) {
            throw new common_1.BadRequestException("Cannot delete period because it has grade records associated");
        }
        await prisma_1.prisma.period.delete({ where: { id: periodId } });
        return { message: "Period deleted successfully" };
    }
    async findAllGroups(schoolId, schoolYearId, user) {
        const targetSchoolId = (user && user.role === client_1.UserRole.SUPER_ADMIN)
            ? (schoolId || user.schoolId)
            : (user?.schoolId || schoolId);
        return prisma_1.prisma.group.findMany({
            where: {
                schoolId: targetSchoolId,
                ...(schoolYearId ? { schoolYearId } : {}),
            },
            orderBy: { name: "asc" },
            include: {
                grade: {
                    select: { name: true, level: true },
                },
                schoolYear: {
                    select: { name: true, active: true },
                },
                school: { select: { name: true, code: true } },
                _count: {
                    select: { enrollments: true, teachers: true },
                },
            },
        });
    }
    async findAllGroupsAllSchools(user) {
        if (user.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException("Only Super Admins can view all groups across schools");
        }
        return prisma_1.prisma.group.findMany({
            orderBy: [{ schoolId: "asc" }, { name: "asc" }],
            include: {
                grade: { select: { name: true, level: true } },
                schoolYear: { select: { name: true, active: true } },
                school: { select: { name: true, code: true } },
                _count: { select: { enrollments: true, teachers: true } },
            },
        });
    }
    async findGroupById(id, user) {
        await this.findGroupOrFail(id, user);
        return prisma_1.prisma.group.findUnique({
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
    async createGroup(schoolId, dto, user) {
        this.requireAdmin(user);
        const targetSchoolId = user.role === client_1.UserRole.SUPER_ADMIN
            ? (dto.schoolId || schoolId)
            : schoolId;
        const grade = await prisma_1.prisma.grade.findUnique({ where: { id: dto.gradeId } });
        if (!grade || grade.schoolId !== targetSchoolId) {
            throw new common_1.NotFoundException("Grade not found");
        }
        const year = await prisma_1.prisma.schoolYear.findUnique({ where: { id: dto.schoolYearId } });
        if (!year || year.schoolId !== targetSchoolId) {
            throw new common_1.NotFoundException("School year not found");
        }
        const existing = await prisma_1.prisma.group.findUnique({
            where: {
                schoolId_gradeId_schoolYearId_name: {
                    schoolId: targetSchoolId,
                    gradeId: dto.gradeId,
                    schoolYearId: dto.schoolYearId,
                    name: dto.name,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Group "${dto.name}" already exists for this grade and year`);
        }
        return prisma_1.prisma.group.create({
            data: {
                name: dto.name,
                gradeId: dto.gradeId,
                schoolYearId: dto.schoolYearId,
                maxStudents: dto.maxStudents,
                schoolId: targetSchoolId,
            },
            include: {
                grade: { select: { name: true, level: true } },
                schoolYear: { select: { name: true, active: true } },
            },
        });
    }
    async updateGroup(id, dto, user) {
        this.requireAdmin(user);
        const group = await this.findGroupOrFail(id, user);
        if (dto.gradeId) {
            const targetGrade = await prisma_1.prisma.grade.findUnique({ where: { id: dto.gradeId } });
            if (!targetGrade || targetGrade.schoolId !== group.schoolId) {
                throw new common_1.NotFoundException("Grade not found for this school");
            }
        }
        const checkGradeId = dto.gradeId ?? group.gradeId;
        const checkName = dto.name ?? group.name;
        if (dto.gradeId || dto.name) {
            const existing = await prisma_1.prisma.group.findUnique({
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
                throw new common_1.ConflictException(`Group "${checkName}" already exists for this grade and year`);
            }
        }
        return prisma_1.prisma.group.update({
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
    async assignGroupTeacher(id, dto, user) {
        this.requireAdmin(user);
        const group = await this.findGroupOrFail(id, user);
        const teacher = await prisma_1.prisma.teacherProfile.findUnique({
            where: { id: dto.teacherProfileId },
            include: { user: true },
        });
        if (!teacher || teacher.user.schoolId !== group.schoolId) {
            throw new common_1.NotFoundException("Teacher profile not found");
        }
        const existing = await prisma_1.prisma.groupTeacher.findUnique({
            where: {
                groupId_teacherProfileId: {
                    groupId: id,
                    teacherProfileId: dto.teacherProfileId,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException("Teacher is already assigned to this group");
        }
        return prisma_1.prisma.groupTeacher.create({
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
    async removeGroupTeacher(id, teacherProfileId, user) {
        this.requireAdmin(user);
        await this.findGroupOrFail(id, user);
        try {
            await prisma_1.prisma.groupTeacher.delete({
                where: {
                    groupId_teacherProfileId: {
                        groupId: id,
                        teacherProfileId,
                    },
                },
            });
            return { message: "Teacher removed from group successfully" };
        }
        catch {
            throw new common_1.NotFoundException("Assignment not found");
        }
    }
    async findAllSubjects(schoolId) {
        return prisma_1.prisma.subject.findMany({
            where: { schoolId },
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { teachers: true },
                },
            },
        });
    }
    async findSubjectById(id, schoolId) {
        await this.findSubjectOrFail(id, schoolId);
        const subject = await prisma_1.prisma.subject.findUnique({
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
        if (!subject)
            return null;
        const groupIds = subject.teachers.map((t) => t.groupId);
        const groups = await prisma_1.prisma.group.findMany({
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
    async createSubject(schoolId, dto, user) {
        this.requireAdmin(user);
        const existing = await prisma_1.prisma.subject.findUnique({
            where: {
                schoolId_name: { schoolId, name: dto.name },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Subject "${dto.name}" already exists in this school`);
        }
        return prisma_1.prisma.subject.create({
            data: { ...dto, schoolId },
        });
    }
    async updateSubject(id, schoolId, dto, user) {
        this.requireAdmin(user);
        await this.findSubjectOrFail(id, schoolId);
        if (dto.name) {
            const existing = await prisma_1.prisma.subject.findUnique({
                where: {
                    schoolId_name: { schoolId, name: dto.name },
                },
            });
            if (existing && existing.id !== id) {
                throw new common_1.ConflictException(`Subject "${dto.name}" already exists in this school`);
            }
        }
        return prisma_1.prisma.subject.update({
            where: { id },
            data: dto,
        });
    }
    async deleteSubject(id, schoolId, user) {
        this.requireAdmin(user);
        await this.findSubjectOrFail(id, schoolId);
        const teachersCount = await prisma_1.prisma.subjectTeacher.count({
            where: { subjectId: id },
        });
        if (teachersCount > 0) {
            throw new common_1.BadRequestException("Cannot delete subject because it has active group assignments");
        }
        await prisma_1.prisma.subject.delete({ where: { id } });
        return { message: "Subject deleted successfully" };
    }
    async assignSubjectTeacher(id, schoolId, dto, user) {
        this.requireAdmin(user);
        await this.findSubjectOrFail(id, schoolId);
        const group = await this.findGroupOrFail(dto.groupId, schoolId);
        const teacher = await prisma_1.prisma.teacherProfile.findUnique({
            where: { id: dto.teacherProfileId },
            include: { user: true },
        });
        if (!teacher || teacher.user.schoolId !== schoolId) {
            throw new common_1.NotFoundException("Teacher profile not found");
        }
        const existing = await prisma_1.prisma.subjectTeacher.findUnique({
            where: {
                subjectId_teacherProfileId_groupId: {
                    subjectId: id,
                    teacherProfileId: dto.teacherProfileId,
                    groupId: dto.groupId,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException("Teacher is already assigned to this subject for this group");
        }
        const created = await prisma_1.prisma.subjectTeacher.create({
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
    async removeSubjectTeacher(id, teacherProfileId, groupId, schoolId, user) {
        this.requireAdmin(user);
        await this.findSubjectOrFail(id, schoolId);
        try {
            await prisma_1.prisma.subjectTeacher.delete({
                where: {
                    subjectId_teacherProfileId_groupId: {
                        subjectId: id,
                        teacherProfileId,
                        groupId,
                    },
                },
            });
            return { message: "Teacher removed from subject assignment successfully" };
        }
        catch {
            throw new common_1.NotFoundException("Assignment not found");
        }
    }
};
exports.AcademicService = AcademicService;
exports.AcademicService = AcademicService = __decorate([
    (0, common_1.Injectable)()
], AcademicService);
//# sourceMappingURL=academic.service.js.map