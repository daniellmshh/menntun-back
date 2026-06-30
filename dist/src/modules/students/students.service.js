"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let StudentsService = class StudentsService {
    configService;
    prisma;
    supabaseAdmin;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const supabaseUrl = this.configService.get("supabase.url") || "";
        const serviceRoleKey = this.configService.get("supabase.serviceRoleKey") || "";
        this.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    async findAll(currentUser, schoolIdFilter) {
        let targetSchoolId;
        if (currentUser.role === client_1.UserRole.SUPER_ADMIN) {
            targetSchoolId = schoolIdFilter;
        }
        else {
            targetSchoolId = currentUser.schoolId;
        }
        const whereClause = {
            role: client_1.UserRole.STUDENT,
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
                            where: { status: client_1.EnrollmentStatus.ACTIVE },
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
    async findById(id, currentUser) {
        const student = await this.prisma.user.findFirst({
            where: {
                id,
                role: client_1.UserRole.STUDENT,
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
            throw new common_1.NotFoundException("Student not found");
        }
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== student.schoolId) {
            throw new common_1.ForbiddenException("Access denied to this student's details");
        }
        return student;
    }
    async create(dto, currentUser) {
        let schoolId = dto.schoolId;
        if (currentUser.role === client_1.UserRole.SUPER_ADMIN) {
            if (!schoolId) {
                throw new common_1.BadRequestException("schoolId is required for SUPER_ADMIN");
            }
        }
        else if (currentUser.role === client_1.UserRole.SCHOOL_ADMIN) {
            if (schoolId && schoolId !== currentUser.schoolId) {
                throw new common_1.ForbiddenException("Cannot create student for another school");
            }
            schoolId = currentUser.schoolId;
        }
        else {
            throw new common_1.ForbiddenException("Only administrators can register students");
        }
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
        });
        if (!school) {
            throw new common_1.NotFoundException("School not found");
        }
        const existing = await this.prisma.user.findFirst({
            where: { schoolId, email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException("User with this email already exists in this school");
        }
        if (dto.groupId) {
            const group = await this.prisma.group.findUnique({
                where: { id: dto.groupId },
            });
            if (!group) {
                throw new common_1.NotFoundException("Group not found");
            }
            if (group.schoolId !== schoolId) {
                throw new common_1.BadRequestException("Group does not belong to the selected school");
            }
            if (group.maxStudents !== null) {
                const activeCount = await this.prisma.enrollment.count({
                    where: { groupId: dto.groupId, status: client_1.EnrollmentStatus.ACTIVE },
                });
                if (activeCount >= group.maxStudents) {
                    throw new common_1.BadRequestException(`Group "${group.name}" is already at full capacity (${group.maxStudents} students)`);
                }
            }
        }
        const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
            email: dto.email,
            password: dto.password,
            email_confirm: true,
            user_metadata: {
                schoolId,
                role: client_1.UserRole.STUDENT,
                firstName: dto.firstName,
                lastName: dto.lastName,
            },
        });
        if (authError || !authData?.user) {
            throw new common_1.BadRequestException(authError?.message || "Failed to register student in Supabase");
        }
        const supabaseUid = authData.user.id;
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    supabaseUid,
                    email: dto.email,
                    schoolId,
                    role: client_1.UserRole.STUDENT,
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
            let enrollment = null;
            if (dto.groupId) {
                enrollment = await tx.enrollment.create({
                    data: {
                        studentProfileId: studentProfile.id,
                        groupId: dto.groupId,
                        status: client_1.EnrollmentStatus.ACTIVE,
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
    async update(id, dto, currentUser) {
        const student = await this.prisma.user.findFirst({
            where: {
                id,
                role: client_1.UserRole.STUDENT,
            },
            include: {
                studentProfile: {
                    include: {
                        enrollments: {
                            where: { status: client_1.EnrollmentStatus.ACTIVE },
                        },
                    },
                },
            },
        });
        if (!student) {
            throw new common_1.NotFoundException("Student not found");
        }
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== student.schoolId) {
            throw new common_1.ForbiddenException("Cannot modify this student's details");
        }
        const userUpdatePayload = {};
        if (dto.firstName !== undefined)
            userUpdatePayload.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            userUpdatePayload.lastName = dto.lastName;
        if (dto.phone !== undefined)
            userUpdatePayload.phone = dto.phone;
        if (dto.active !== undefined)
            userUpdatePayload.active = dto.active;
        const profileUpdatePayload = {};
        if (dto.enrollmentNumber !== undefined)
            profileUpdatePayload.enrollmentNumber = dto.enrollmentNumber;
        if (dto.birthDate !== undefined)
            profileUpdatePayload.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
        if (dto.gender !== undefined)
            profileUpdatePayload.gender = dto.gender;
        if (dto.bloodType !== undefined)
            profileUpdatePayload.bloodType = dto.bloodType;
        if (dto.address !== undefined)
            profileUpdatePayload.address = dto.address;
        const updatedUser = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id },
                data: userUpdatePayload,
            });
            const profile = await tx.studentProfile.update({
                where: { userId: id },
                data: profileUpdatePayload,
            });
            if (dto.groupId !== undefined) {
                await tx.enrollment.updateMany({
                    where: {
                        studentProfileId: profile.id,
                        status: client_1.EnrollmentStatus.ACTIVE,
                    },
                    data: {
                        status: client_1.EnrollmentStatus.INACTIVE,
                    },
                });
                if (dto.groupId) {
                    const group = await tx.group.findUnique({
                        where: { id: dto.groupId },
                    });
                    if (!group) {
                        throw new common_1.NotFoundException("Group not found");
                    }
                    if (group.schoolId !== student.schoolId) {
                        throw new common_1.BadRequestException("Group does not belong to the student's school");
                    }
                    if (group.maxStudents !== null) {
                        const activeCount = await tx.enrollment.count({
                            where: { groupId: dto.groupId, status: client_1.EnrollmentStatus.ACTIVE },
                        });
                        if (activeCount >= group.maxStudents) {
                            throw new common_1.BadRequestException(`Group "${group.name}" is already at full capacity (${group.maxStudents} students)`);
                        }
                    }
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
                            status: client_1.EnrollmentStatus.ACTIVE,
                        },
                        update: {
                            status: client_1.EnrollmentStatus.ACTIVE,
                        },
                    });
                }
            }
            const activeEnrollments = await tx.enrollment.findMany({
                where: {
                    studentProfileId: profile.id,
                    status: client_1.EnrollmentStatus.ACTIVE,
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
        const supabaseMetadata = {};
        if (dto.firstName !== undefined)
            supabaseMetadata.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            supabaseMetadata.lastName = dto.lastName;
        const supabaseUpdatePayload = {};
        if (Object.keys(supabaseMetadata).length > 0) {
            supabaseUpdatePayload.user_metadata = {
                role: client_1.UserRole.STUDENT,
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
            const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(student.supabaseUid, supabaseUpdatePayload);
            if (authError) {
                console.error("Failed to sync updated student credentials to Supabase:", authError);
            }
        }
        return updatedUser;
    }
    async delete(id, currentUser) {
        const student = await this.prisma.user.findFirst({
            where: {
                id,
                role: client_1.UserRole.STUDENT,
            },
            include: {
                studentProfile: true,
            },
        });
        if (!student) {
            throw new common_1.NotFoundException("Student not found");
        }
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== student.schoolId) {
            throw new common_1.ForbiddenException("Cannot delete this student");
        }
        const profileId = student.studentProfile?.id;
        if (profileId) {
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
                throw new common_1.BadRequestException(`Cannot delete student because they have academic records: ${attendanceCount} attendance logs, ${gradeRecordsCount} grades, ${taskDeliveriesCount} task submissions. Deactivate their profile instead.`);
            }
        }
        await this.prisma.$transaction(async (tx) => {
            if (profileId) {
                await tx.enrollment.deleteMany({
                    where: { studentProfileId: profileId },
                });
                await tx.parentStudent.deleteMany({
                    where: { studentProfileId: profileId },
                });
                await tx.studentProfile.delete({
                    where: { id: profileId },
                });
            }
            await tx.user.delete({
                where: { id },
            });
        });
        const { error: authError } = await this.supabaseAdmin.auth.admin.deleteUser(student.supabaseUid);
        if (authError) {
            console.error("Failed to delete user from Supabase Auth during student deletion:", authError);
        }
        return { id, email: student.email, success: true };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)("PRISMA")),
    __metadata("design:paramtypes", [config_1.ConfigService,
        client_1.PrismaClient])
], StudentsService);
//# sourceMappingURL=students.service.js.map