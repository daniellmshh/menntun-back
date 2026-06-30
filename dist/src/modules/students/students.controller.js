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
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const students_service_1 = require("./students.service");
const students_dto_1 = require("./students.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const types_1 = require("../../common/types");
let StudentsController = class StudentsController {
    studentsService;
    constructor(studentsService) {
        this.studentsService = studentsService;
    }
    async findAll(user, schoolIdFilter) {
        const data = await this.studentsService.findAll(user, schoolIdFilter);
        return (0, types_1.successResponse)(data);
    }
    async findById(id, user) {
        const data = await this.studentsService.findById(id, user);
        return (0, types_1.successResponse)(data);
    }
    async create(dto, user) {
        const data = await this.studentsService.create(dto, user);
        return (0, types_1.successResponse)(data);
    }
    async update(id, dto, user) {
        const data = await this.studentsService.update(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async delete(id, user) {
        const data = await this.studentsService.delete(id, user);
        return (0, types_1.successResponse)(data);
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "List students (SUPER_ADMIN lists all/filters, ADMIN/TEACHER lists school-scoped)" }),
    (0, swagger_1.ApiQuery)({ name: "schoolId", required: false, description: "Filter by school ID (SUPER_ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("schoolId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Get student details by ID" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Register a new student (ADMIN only)" }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [students_dto_1.CreateStudentDto, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update student profile information (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, students_dto_1.UpdateStudentDto, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Delete student profile and auth account (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StudentsController.prototype, "delete", null);
exports.StudentsController = StudentsController = __decorate([
    (0, swagger_1.ApiTags)("Students"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)("students"),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map