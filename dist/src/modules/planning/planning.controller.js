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
exports.PlanningController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const planning_generation_service_1 = require("./planning-generation.service");
const nem_knowledge_service_1 = require("./nem-knowledge.service");
const planning_dto_1 = require("./planning.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const types_1 = require("../../common/types");
let PlanningController = class PlanningController {
    planningService;
    nemKnowledgeService;
    constructor(planningService, nemKnowledgeService) {
        this.planningService = planningService;
        this.nemKnowledgeService = nemKnowledgeService;
    }
    async generate(dto, user) {
        const { planning, sugerenciaIA } = await this.planningService.generatePlanning(dto, user);
        return (0, types_1.successResponse)({ planning, sugerenciaIA });
    }
    async getTeachersList(user) {
        const data = await this.planningService.getTeachersList(user.schoolId);
        return (0, types_1.successResponse)(data);
    }
    getCurriculumCatalog() {
        const data = this.nemKnowledgeService.getCurriculumCatalog();
        return (0, types_1.successResponse)(data);
    }
    async findAll(user) {
        const data = await this.planningService.findAll(user);
        return (0, types_1.successResponse)(data);
    }
    async findById(id, user) {
        const data = await this.planningService.findById(id, user);
        return (0, types_1.successResponse)(data);
    }
    async update(id, dto, user) {
        const data = await this.planningService.update(id, dto, user);
        return (0, types_1.successResponse)(data);
    }
    async delete(id, user) {
        const data = await this.planningService.delete(id, user);
        return (0, types_1.successResponse)(data);
    }
};
exports.PlanningController = PlanningController;
__decorate([
    (0, common_1.Post)("generate"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Generar una planeación apoyada por IA y RAG (DRAFT)" }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [planning_dto_1.GeneratePlanningDto, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)("teachers-list"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: "Obtener la lista de profesores de la escuela actual para asignación" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "getTeachersList", null);
__decorate([
    (0, common_1.Get)("curriculum-catalog"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Obtener el catálogo completo de campos formativos y contenidos de la SEP" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PlanningController.prototype, "getCurriculumCatalog", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Listar todas las planeaciones accesibles por el usuario" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Obtener el detalle de una planeación por ID" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Actualizar campos editables de una planeación" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, planning_dto_1.UpdatePlanningDto, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.SCHOOL_ADMIN, client_1.UserRole.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: "Eliminar definitivamente una planeación" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PlanningController.prototype, "delete", null);
exports.PlanningController = PlanningController = __decorate([
    (0, swagger_1.ApiTags)("Planning"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)("planning"),
    __metadata("design:paramtypes", [planning_generation_service_1.PlanningGenerationService,
        nem_knowledge_service_1.NemKnowledgeService])
], PlanningController);
//# sourceMappingURL=planning.controller.js.map