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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
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
    async syncUser(token, dto) {
        const { data: authData, error: authError } = await this.supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) {
            throw new common_1.UnauthorizedException("Invalid or expired Supabase token");
        }
        const supabaseUid = authData.user.id;
        const email = authData.user.email;
        if (!supabaseUid || !email) {
            throw new common_1.UnauthorizedException("Invalid token payload");
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
                return user;
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
            }
            else if (dto.role === "STUDENT") {
                await tx.studentProfile.create({
                    data: { userId: user.id },
                });
            }
            else if (dto.role === "PARENT" || dto.role === "TUTOR") {
                await tx.parentProfile.create({
                    data: { userId: user.id },
                });
            }
            return tx.user.findUnique({
                where: { id: user.id },
                include: {
                    teacherProfile: true,
                    studentProfile: true,
                    parentProfile: true,
                },
            });
        });
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                teacherProfile: true,
                studentProfile: true,
                parentProfile: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException("User not found");
        }
        return user;
    }
    async getMeModules(currentUser) {
        const activeSchoolModules = await this.prisma.schoolModule.findMany({
            where: {
                schoolId: currentUser.schoolId,
                active: true,
            },
            select: {
                module: true,
            },
        });
        const activeSchoolNames = activeSchoolModules.map((sm) => sm.module.toLowerCase());
        if (currentUser.role === client_1.UserRole.TEACHER) {
            const teacherProfile = await this.prisma.teacherProfile.findUnique({
                where: { userId: currentUser.id },
                select: { allowedModules: true },
            });
            const allowedModules = teacherProfile?.allowedModules ?? [];
            if (allowedModules.length > 0) {
                const allowedLower = allowedModules.map((m) => m.toLowerCase());
                const filtered = activeSchoolNames.filter((m) => allowedLower.includes(m));
                return Array.from(new Set(filtered));
            }
        }
        const coreModules = ["auth", "schools", "academic"];
        return Array.from(new Set([...coreModules, ...activeSchoolNames]));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)("PRISMA")),
    __metadata("design:paramtypes", [config_1.ConfigService,
        client_1.PrismaClient])
], AuthService);
//# sourceMappingURL=auth.service.js.map