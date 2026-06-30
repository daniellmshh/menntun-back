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
exports.AcademicController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const academic_service_1 = require("./academic.service");
const academic_dto_1 = require("./academic.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const types_1 = require("../../common/types");
let AcademicController = class AcademicController {
    academicService;
    constructor(academicService) {
        this.academicService = academicService;
    }
    async findAllGrades(user, schoolId) {
        const data = await this.academicService.findAllGrades(schoolId || user.schoolId, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllGradesAllSchools(user) {
        const data = await this.academicService.findAllGradesAllSchools(user);
        return (0, types_1.successResponse)(data);
    }
    async createGrade(user, dto) {
        const data = await this.academicService.createGrade(user.schoolId, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updateGrade(id, user, dto) {
        const data = await this.academicService.updateGrade(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async deleteGrade(id, user) {
        const data = await this.academicService.deleteGrade(id, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllSchoolYears(user, schoolId) {
        const data = await this.academicService.findAllSchoolYears(schoolId || user.schoolId, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllSchoolYearsAllSchools(user) {
        const data = await this.academicService.findAllSchoolYearsAllSchools(user);
        return (0, types_1.successResponse)(data);
    }
    async findActiveSchoolYear(user) {
        const data = await this.academicService.findActiveSchoolYear(user.schoolId);
        return (0, types_1.successResponse)(data);
    }
    async findSchoolYearById(id, user) {
        const data = await this.academicService.findSchoolYearById(id, user);
        return (0, types_1.successResponse)(data);
    }
    async createSchoolYear(user, dto) {
        const data = await this.academicService.createSchoolYear(dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updateSchoolYear(id, user, dto) {
        const data = await this.academicService.updateSchoolYear(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async closeSchoolYear(id, user) {
        const data = await this.academicService.closeSchoolYear(id, user);
        return (0, types_1.successResponse)(data);
    }
    async deleteSchoolYear(id, user) {
        const data = await this.academicService.deleteSchoolYear(id, user);
        return (0, types_1.successResponse)(data);
    }
    async addPeriod(id, user, dto) {
        const data = await this.academicService.addPeriod(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updatePeriod(id, pid, user, dto) {
        const data = await this.academicService.updatePeriod(id, pid, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async deletePeriod(id, pid, user) {
        const data = await this.academicService.deletePeriod(id, pid, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllGroups(user, schoolId, schoolYearId) {
        const data = await this.academicService.findAllGroups(schoolId || user.schoolId, schoolYearId, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllGroupsAllSchools(user) {
        const data = await this.academicService.findAllGroupsAllSchools(user);
        return (0, types_1.successResponse)(data);
    }
    async findGroupById(id, user) {
        const data = await this.academicService.findGroupById(id, user);
        return (0, types_1.successResponse)(data);
    }
    async createGroup(user, dto) {
        const data = await this.academicService.createGroup(user.schoolId, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updateGroup(id, user, dto) {
        const data = await this.academicService.updateGroup(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async assignGroupTeacher(id, user, dto) {
        const data = await this.academicService.assignGroupTeacher(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async removeGroupTeacher(id, tid, user) {
        const data = await this.academicService.removeGroupTeacher(id, tid, user);
        return (0, types_1.successResponse)(data);
    }
    async findAllSubjects(user) {
        const data = await this.academicService.findAllSubjects(user.schoolId);
        return (0, types_1.successResponse)(data);
    }
    async findSubjectById(id, user) {
        const data = await this.academicService.findSubjectById(id, user.schoolId);
        return (0, types_1.successResponse)(data);
    }
    async createSubject(user, dto) {
        const data = await this.academicService.createSubject(user.schoolId, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async updateSubject(id, user, dto) {
        const data = await this.academicService.updateSubject(id, user.schoolId, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async deleteSubject(id, user) {
        const data = await this.academicService.deleteSubject(id, user.schoolId, user);
        return (0, types_1.successResponse)(data);
    }
    async assignSubjectTeacher(id, user, dto) {
        const data = await this.academicService.assignSubjectTeacher(id, user.schoolId, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async removeSubjectTeacher(id, tid, gid, user) {
        const data = await this.academicService.removeSubjectTeacher(id, tid, gid, user.schoolId, user);
        return (0, types_1.successResponse)(data);
    }
};
exports.AcademicController = AcademicController;
__decorate([
    (0, common_1.Get)("grades"),
    (0, swagger_1.ApiOperation)({ summary: "List all grades for school (SUPER_ADMIN can filter by ?schoolId)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("schoolId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllGrades", null);
__decorate([
    (0, common_1.Get)("grades/all"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "List ALL grades across all schools (SUPER_ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllGradesAllSchools", null);
__decorate([
    (0, common_1.Post)("grades"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create grade (ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, academic_dto_1.CreateGradeDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createGrade", null);
__decorate([
    (0, common_1.Patch)("grades/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update grade (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.UpdateGradeDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateGrade", null);
__decorate([
    (0, common_1.Delete)("grades/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Delete grade (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "deleteGrade", null);
__decorate([
    (0, common_1.Get)("school-years"),
    (0, swagger_1.ApiOperation)({ summary: "List school years (scoped by role; SUPER_ADMIN can filter by ?schoolId)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("schoolId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllSchoolYears", null);
__decorate([
    (0, common_1.Get)("school-years/all"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "List ALL school years across all schools (SUPER_ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllSchoolYearsAllSchools", null);
__decorate([
    (0, common_1.Get)("school-years/active"),
    (0, swagger_1.ApiOperation)({ summary: "Get active school year with periods" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findActiveSchoolYear", null);
__decorate([
    (0, common_1.Get)("school-years/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get a school year by ID with its periods" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findSchoolYearById", null);
__decorate([
    (0, common_1.Post)("school-years"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create a school year (with optional periods)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, academic_dto_1.CreateSchoolYearDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createSchoolYear", null);
__decorate([
    (0, common_1.Patch)("school-years/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update a school year (name, dates, active status)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.UpdateSchoolYearDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateSchoolYear", null);
__decorate([
    (0, common_1.Post)("school-years/:id/close"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Close (deactivate) a school year" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "closeSchoolYear", null);
__decorate([
    (0, common_1.Delete)("school-years/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Delete a school year (only if no groups assigned)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "deleteSchoolYear", null);
__decorate([
    (0, common_1.Post)("school-years/:id/periods"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Add a period to a school year" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.CreatePeriodDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "addPeriod", null);
__decorate([
    (0, common_1.Patch)("school-years/:id/periods/:pid"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update a period" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("pid")),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, academic_dto_1.UpdatePeriodDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updatePeriod", null);
__decorate([
    (0, common_1.Delete)("school-years/:id/periods/:pid"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Delete a period (blocked if grade records exist)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("pid")),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "deletePeriod", null);
__decorate([
    (0, common_1.Get)("groups"),
    (0, swagger_1.ApiOperation)({ summary: "List groups (optionally filtered by schoolYearId or schoolId)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("schoolId")),
    __param(2, (0, common_1.Query)("schoolYearId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllGroups", null);
__decorate([
    (0, common_1.Get)("groups/all"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "List ALL groups across all schools (SUPER_ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllGroupsAllSchools", null);
__decorate([
    (0, common_1.Get)("groups/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get group by id with teachers and enrollments count" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findGroupById", null);
__decorate([
    (0, common_1.Post)("groups"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create group (ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, academic_dto_1.CreateGroupDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Patch)("groups/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update group (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.UpdateGroupDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateGroup", null);
__decorate([
    (0, common_1.Post)("groups/:id/teachers"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Assign teacher to group (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.AssignGroupTeacherDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "assignGroupTeacher", null);
__decorate([
    (0, common_1.Delete)("groups/:id/teachers/:tid"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Remove teacher from group (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("tid")),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "removeGroupTeacher", null);
__decorate([
    (0, common_1.Get)("subjects"),
    (0, swagger_1.ApiOperation)({ summary: "List all subjects for school" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findAllSubjects", null);
__decorate([
    (0, common_1.Get)("subjects/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get subject by id with teacher assignments" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "findSubjectById", null);
__decorate([
    (0, common_1.Post)("subjects"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Create subject (ADMIN only)" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, academic_dto_1.CreateSubjectDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "createSubject", null);
__decorate([
    (0, common_1.Patch)("subjects/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Update subject (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.UpdateSubjectDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "updateSubject", null);
__decorate([
    (0, common_1.Delete)("subjects/:id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Delete subject (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "deleteSubject", null);
__decorate([
    (0, common_1.Post)("subjects/:id/teachers"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Assign teacher to subject (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, academic_dto_1.AssignSubjectTeacherDto]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "assignSubjectTeacher", null);
__decorate([
    (0, common_1.Delete)("subjects/:id/teachers/:tid/:gid"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Remove teacher from subject assignment (ADMIN only)" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("tid")),
    __param(2, (0, common_1.Param)("gid")),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AcademicController.prototype, "removeSubjectTeacher", null);
exports.AcademicController = AcademicController = __decorate([
    (0, swagger_1.ApiTags)("Academic"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)("academic"),
    __metadata("design:paramtypes", [academic_service_1.AcademicService])
], AcademicController);
//# sourceMappingURL=academic.controller.js.map