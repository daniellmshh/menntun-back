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
exports.SchoolsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const schools_service_1 = require("./schools.service");
const schools_dto_1 = require("./schools.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const types_1 = require("../../common/types");
let SchoolsController = class SchoolsController {
    schoolsService;
    constructor(schoolsService) {
        this.schoolsService = schoolsService;
    }
    async findAll() {
        const data = await this.schoolsService.findAll();
        return (0, types_1.successResponse)(data);
    }
    async create(dto) {
        const data = await this.schoolsService.create(dto);
        return (0, types_1.successResponse)(data);
    }
    async findMySchool(user) {
        const data = await this.schoolsService.findMySchool(user);
        return (0, types_1.successResponse)(data);
    }
    async getStats(user) {
        const data = await this.schoolsService.getStats(user);
        return (0, types_1.successResponse)(data);
    }
    async findById(id, user) {
        const data = await this.schoolsService.findById(id, user);
        return (0, types_1.successResponse)(data);
    }
    async update(id, dto, user) {
        const data = await this.schoolsService.update(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async getModules(id, user) {
        const data = await this.schoolsService.getModules(id, user);
        return (0, types_1.successResponse)(data);
    }
    async updateModules(id, dto, user) {
        const data = await this.schoolsService.updateModules(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async findUsers(id, user) {
        const data = await this.schoolsService.findUsers(id, user);
        return (0, types_1.successResponse)(data);
    }
    async createUser(id, dto, user) {
        const data = await this.schoolsService.createUser(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updateUser(id, userId, dto, user) {
        const data = await this.schoolsService.updateUser(id, userId, dto, user);
        return (0, types_1.successResponse)(data);
    }
};
exports.SchoolsController = SchoolsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "List all schools (SUPER_ADMIN only)" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create a new school (SUPER_ADMIN only)" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schools_dto_1.CreateSchoolDto]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("me"),
    (0, swagger_1.ApiOperation)({ summary: "Get current user school details" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "findMySchool", null);
__decorate([
    (0, common_1.Get)("me/stats"),
    (0, swagger_1.ApiOperation)({ summary: "Get stats for current user school" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Get school by id" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update school details" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schools_dto_1.UpdateSchoolDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(":id/modules"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Get module status for a school" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "getModules", null);
__decorate([
    (0, common_1.Patch)(":id/modules"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Enable or disable modules" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schools_dto_1.UpdateModulesDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "updateModules", null);
__decorate([
    (0, common_1.Get)(":id/users"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Get all users of a school" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "findUsers", null);
__decorate([
    (0, common_1.Post)(":id/users"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create a user in a school" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schools_dto_1.CreateSchoolUserDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)(":id/users/:userId"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update a user in a school" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, schools_dto_1.UpdateSchoolUserDto, Object]),
    __metadata("design:returntype", Promise)
], SchoolsController.prototype, "updateUser", null);
exports.SchoolsController = SchoolsController = __decorate([
    (0, swagger_1.ApiTags)("Schools"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)("schools"),
    __metadata("design:paramtypes", [schools_service_1.SchoolsService])
], SchoolsController);
//# sourceMappingURL=schools.controller.js.map