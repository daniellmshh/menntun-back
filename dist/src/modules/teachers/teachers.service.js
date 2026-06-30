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
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let TeachersService = class TeachersService {
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
        else if (currentUser.role === client_1.UserRole.SCHOOL_ADMIN) {
            targetSchoolId = currentUser.schoolId;
        }
        else {
            targetSchoolId = currentUser.schoolId;
        }
        const whereClause = {
            role: client_1.UserRole.TEACHER,
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
    async findById(id, currentUser) {
        const teacher = await this.prisma.user.findFirst({
            where: {
                id,
                role: client_1.UserRole.TEACHER,
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
            throw new common_1.NotFoundException("Teacher not found");
        }
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== teacher.schoolId) {
            throw new common_1.ForbiddenException("Access denied to this teacher's details");
        }
        return teacher;
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
                throw new common_1.ForbiddenException("Cannot create teacher for another school");
            }
            schoolId = currentUser.schoolId;
        }
        else {
            throw new common_1.ForbiddenException("Only administrators can register teachers");
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
        if (dto.allowedModules && dto.allowedModules.length > 0) {
            const activeSchoolModules = await this.prisma.schoolModule.findMany({
                where: { schoolId, active: true },
                select: { module: true },
            });
            const activeNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());
            const invalidModules = dto.allowedModules.filter((m) => !activeNames.includes(m.toLowerCase()));
            if (invalidModules.length > 0) {
                throw new common_1.BadRequestException(`Cannot grant permissions to inactive school modules: ${invalidModules.join(", ")}`);
            }
        }
        const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
            email: dto.email,
            password: dto.password,
            email_confirm: true,
            user_metadata: {
                schoolId,
                role: client_1.UserRole.TEACHER,
                firstName: dto.firstName,
                lastName: dto.lastName,
            },
        });
        if (authError || !authData?.user) {
            throw new common_1.BadRequestException(authError?.message || "Failed to register teacher in Supabase");
        }
        const supabaseUid = authData.user.id;
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    supabaseUid,
                    email: dto.email,
                    schoolId,
                    role: client_1.UserRole.TEACHER,
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
    async update(id, dto, currentUser) {
        const teacher = await this.prisma.user.findFirst({
            where: {
                id,
                role: client_1.UserRole.TEACHER,
            },
            include: {
                teacherProfile: true,
            },
        });
        if (!teacher) {
            throw new common_1.NotFoundException("Teacher not found");
        }
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== teacher.schoolId) {
            throw new common_1.ForbiddenException("Cannot modify this teacher's details");
        }
        if (dto.allowedModules !== undefined) {
            if (dto.allowedModules.length > 0) {
                const activeSchoolModules = await this.prisma.schoolModule.findMany({
                    where: { schoolId: teacher.schoolId, active: true },
                    select: { module: true },
                });
                const activeNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());
                const invalidModules = dto.allowedModules.filter((m) => !activeNames.includes(m.toLowerCase()));
                if (invalidModules.length > 0) {
                    throw new common_1.BadRequestException(`Cannot grant permissions to inactive school modules: ${invalidModules.join(", ")}`);
                }
            }
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
        if (dto.employeeNumber !== undefined)
            profileUpdatePayload.employeeNumber = dto.employeeNumber;
        if (dto.specialty !== undefined)
            profileUpdatePayload.specialty = dto.specialty;
        if (dto.hireDate !== undefined)
            profileUpdatePayload.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
        if (dto.allowedModules !== undefined)
            profileUpdatePayload.allowedModules = dto.allowedModules;
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
        const supabaseMetadata = {};
        if (dto.firstName !== undefined)
            supabaseMetadata.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            supabaseMetadata.lastName = dto.lastName;
        const supabaseUpdatePayload = {};
        if (Object.keys(supabaseMetadata).length > 0) {
            supabaseUpdatePayload.user_metadata = {
                ...(teacher.firstName !== dto.firstName || teacher.lastName !== dto.lastName
                    ? {
                        role: client_1.UserRole.TEACHER,
                        schoolId: teacher.schoolId,
                        firstName: dto.firstName ?? teacher.firstName,
                        lastName: dto.lastName ?? teacher.lastName,
                    }
                    : {}),
            };
        }
        if (dto.active !== undefined) {
            supabaseUpdatePayload.app_metadata = {
                suspended: !dto.active,
            };
        }
        if (Object.keys(supabaseUpdatePayload).length > 0) {
            const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(teacher.supabaseUid, supabaseUpdatePayload);
            if (authError) {
                console.error("Failed to sync updated teacher credentials to Supabase:", authError);
            }
        }
        return updatedUser;
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)("PRISMA")),
    __metadata("design:paramtypes", [config_1.ConfigService,
        client_1.PrismaClient])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map