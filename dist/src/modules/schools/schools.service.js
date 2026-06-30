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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../lib/prisma");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const CORE_MODULES = ["auth", "schools", "academic"];
const ALL_MODULES = [
    "academic",
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
let SchoolsService = class SchoolsService {
    configService;
    supabaseAdmin;
    constructor(configService) {
        this.configService = configService;
        const supabaseUrl = this.configService.get("supabase.url") || "";
        const serviceRoleKey = this.configService.get("supabase.serviceRoleKey") || "";
        this.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    async findAll() {
        return prisma_1.prisma.school.findMany({
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
    async create(dto) {
        const existing = await prisma_1.prisma.school.findUnique({
            where: { code: dto.code },
        });
        if (existing) {
            throw new common_1.ConflictException(`A school with code "${dto.code}" already exists`);
        }
        const school = await prisma_1.prisma.school.create({ data: dto });
        await prisma_1.prisma.schoolModule.createMany({
            data: ALL_MODULES.map((module) => ({
                schoolId: school.id,
                module,
                active: true,
            })),
        });
        return school;
    }
    async findMySchool(currentUser) {
        const school = await prisma_1.prisma.school.findUnique({
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
            throw new common_1.NotFoundException("School not found");
        }
        return school;
    }
    async findById(id, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const school = await prisma_1.prisma.school.findUnique({
            where: { id },
            include: {
                schoolModules: { orderBy: { module: "asc" } },
                _count: { select: { users: true } },
            },
        });
        if (!school)
            throw new common_1.NotFoundException("School not found");
        return school;
    }
    async update(id, dto, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== id) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const school = await prisma_1.prisma.school.findUnique({ where: { id } });
        if (!school)
            throw new common_1.NotFoundException("School not found");
        return prisma_1.prisma.school.update({ where: { id }, data: dto });
    }
    async getModules(schoolId, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            currentUser.schoolId !== schoolId) {
            throw new common_1.ForbiddenException("Access denied");
        }
        const activeModules = await prisma_1.prisma.schoolModule.findMany({
            where: { schoolId },
            orderBy: { module: "asc" },
        });
        return ALL_MODULES.map((module) => ({
            module,
            active: activeModules.find((m) => m.module === module)?.active ?? false,
            isCore: CORE_MODULES.includes(module),
        }));
    }
    async updateModules(schoolId, dto, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            (currentUser.role !== client_1.UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)) {
            throw new common_1.ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can change module status");
        }
        const school = await prisma_1.prisma.school.findUnique({ where: { id: schoolId } });
        if (!school)
            throw new common_1.NotFoundException("School not found");
        const coreConflicts = dto.modules.filter((m) => CORE_MODULES.includes(m));
        if (coreConflicts.length > 0) {
            throw new common_1.ForbiddenException(`Cannot modify core modules: ${coreConflicts.join(", ")}`);
        }
        await Promise.all(dto.modules.map((module) => prisma_1.prisma.schoolModule.upsert({
            where: { schoolId_module: { schoolId, module } },
            update: { active: dto.active },
            create: { schoolId, module, active: dto.active },
        })));
        return this.getModules(schoolId, currentUser);
    }
    async getStats(currentUser) {
        const schoolId = currentUser.schoolId;
        const [totalUsers, totalStudents, totalTeachers, activeModules] = await Promise.all([
            prisma_1.prisma.user.count({ where: { schoolId, active: true } }),
            prisma_1.prisma.user.count({
                where: { schoolId, role: client_1.UserRole.STUDENT, active: true },
            }),
            prisma_1.prisma.user.count({
                where: { schoolId, role: client_1.UserRole.TEACHER, active: true },
            }),
            prisma_1.prisma.schoolModule.count({
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
    async findUsers(schoolId, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            (currentUser.role !== client_1.UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)) {
            throw new common_1.ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can view school users");
        }
        const school = await prisma_1.prisma.school.findUnique({ where: { id: schoolId } });
        if (!school)
            throw new common_1.NotFoundException("School not found");
        return prisma_1.prisma.user.findMany({
            where: { schoolId },
            orderBy: { createdAt: "desc" },
        });
    }
    async createUser(schoolId, dto, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            (currentUser.role !== client_1.UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)) {
            throw new common_1.ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can create users");
        }
        const school = await prisma_1.prisma.school.findUnique({ where: { id: schoolId } });
        if (!school)
            throw new common_1.NotFoundException("School not found");
        const existing = await prisma_1.prisma.user.findFirst({
            where: { schoolId, email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException("User with this email already exists in this school");
        }
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
            throw new common_1.BadRequestException(authError?.message || "Failed to create user in Supabase");
        }
        const supabaseUid = authData.user.id;
        return prisma_1.prisma.$transaction(async (tx) => {
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
            if (dto.role === client_1.UserRole.TEACHER) {
                await tx.teacherProfile.create({
                    data: { userId: user.id },
                });
            }
            else if (dto.role === client_1.UserRole.STUDENT) {
                await tx.studentProfile.create({
                    data: { userId: user.id },
                });
            }
            else if (dto.role === client_1.UserRole.PARENT || dto.role === client_1.UserRole.TUTOR) {
                await tx.parentProfile.create({
                    data: { userId: user.id },
                });
            }
            return user;
        });
    }
    async updateUser(schoolId, userId, dto, currentUser) {
        if (currentUser.role !== client_1.UserRole.SUPER_ADMIN &&
            (currentUser.role !== client_1.UserRole.SCHOOL_ADMIN || currentUser.schoolId !== schoolId)) {
            throw new common_1.ForbiddenException("Only SUPER_ADMIN or the school's SCHOOL_ADMIN can update users");
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, schoolId },
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found in this school");
        }
        const updateData = {};
        if (dto.role !== undefined)
            updateData.role = dto.role;
        if (dto.active !== undefined)
            updateData.active = dto.active;
        if (dto.firstName !== undefined)
            updateData.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            updateData.lastName = dto.lastName;
        if (dto.phone !== undefined)
            updateData.phone = dto.phone;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
        if (dto.role !== undefined ||
            dto.firstName !== undefined ||
            dto.lastName !== undefined) {
            const { error: authError } = await this.supabaseAdmin.auth.admin.updateUserById(user.supabaseUid, {
                user_metadata: {
                    role: dto.role ?? user.role,
                    firstName: dto.firstName ?? user.firstName,
                    lastName: dto.lastName ?? user.lastName,
                },
            });
            if (authError) {
                console.error("Failed to sync updated user metadata to Supabase:", authError);
            }
        }
        return updatedUser;
    }
};
exports.SchoolsService = SchoolsService;
exports.SchoolsService = SchoolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SchoolsService);
//# sourceMappingURL=schools.service.js.map