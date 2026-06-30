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
exports.UpdatePlanningDto = exports.GeneratePlanningDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class GeneratePlanningDto {
    contextoInicial;
    modalidad;
    campoFormativo;
    contenidoId;
    ejesArticuladores;
    groupId;
    subjectId;
    standaloneLevel;
    standaloneGradeOrder;
    targetTeacherProfileId;
}
exports.GeneratePlanningDto = GeneratePlanningDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(5, { message: "El contexto inicial debe tener al menos 5 caracteres" }),
    (0, class_validator_1.ValidateIf)((o) => !o.modalidad),
    (0, class_validator_1.MinLength)(20, { message: "El contexto inicial debe tener al menos 20 caracteres cuando no se especifica la modalidad" }),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "contextoInicial", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PlanningModalidad),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "modalidad", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.CampoFormativo),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "campoFormativo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "contenidoId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.EjeArticulador, { each: true }),
    __metadata("design:type", Array)
], GeneratePlanningDto.prototype, "ejesArticuladores", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "subjectId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.NivelEducativo),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "standaloneLevel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GeneratePlanningDto.prototype, "standaloneGradeOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GeneratePlanningDto.prototype, "targetTeacherProfileId", void 0);
class UpdatePlanningDto {
    title;
    contenidos;
    pda;
    relevanciaSocial;
    produccionSugerida;
    fases;
    recursos;
    campoFormativo;
    ejesArticuladores;
    status;
}
exports.UpdatePlanningDto = UpdatePlanningDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "contenidos", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "pda", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "relevanciaSocial", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "produccionSugerida", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePlanningDto.prototype, "fases", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdatePlanningDto.prototype, "recursos", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.CampoFormativo),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "campoFormativo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.EjeArticulador, { each: true }),
    __metadata("design:type", Array)
], UpdatePlanningDto.prototype, "ejesArticuladores", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PlanningStatus),
    __metadata("design:type", String)
], UpdatePlanningDto.prototype, "status", void 0);
//# sourceMappingURL=planning.dto.js.map