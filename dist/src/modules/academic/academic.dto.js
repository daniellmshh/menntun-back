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
exports.AssignSubjectTeacherDto = exports.UpdateSubjectDto = exports.CreateSubjectDto = exports.AssignGroupTeacherDto = exports.UpdateGroupDto = exports.CreateGroupDto = exports.UpdateGradeDto = exports.CreateGradeDto = exports.UpdatePeriodDto = exports.UpdateSchoolYearDto = exports.CreateSchoolYearDto = exports.CreatePeriodDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreatePeriodDto {
    name;
    startDate;
    endDate;
    order;
}
exports.CreatePeriodDto = CreatePeriodDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePeriodDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePeriodDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePeriodDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreatePeriodDto.prototype, "order", void 0);
class CreateSchoolYearDto {
    name;
    startDate;
    endDate;
    schoolId;
    periods;
}
exports.CreateSchoolYearDto = CreateSchoolYearDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSchoolYearDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSchoolYearDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSchoolYearDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSchoolYearDto.prototype, "schoolId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePeriodDto),
    __metadata("design:type", Array)
], CreateSchoolYearDto.prototype, "periods", void 0);
class UpdateSchoolYearDto {
    name;
    startDate;
    endDate;
    active;
}
exports.UpdateSchoolYearDto = UpdateSchoolYearDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSchoolYearDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSchoolYearDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSchoolYearDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateSchoolYearDto.prototype, "active", void 0);
class UpdatePeriodDto {
    name;
    startDate;
    endDate;
    order;
}
exports.UpdatePeriodDto = UpdatePeriodDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePeriodDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePeriodDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePeriodDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdatePeriodDto.prototype, "order", void 0);
class CreateGradeDto {
    name;
    order;
    level;
    schoolId;
}
exports.CreateGradeDto = CreateGradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateGradeDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.NivelEducativo),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateGradeDto.prototype, "schoolId", void 0);
class UpdateGradeDto {
    name;
    order;
    level;
}
exports.UpdateGradeDto = UpdateGradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateGradeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateGradeDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.NivelEducativo),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateGradeDto.prototype, "level", void 0);
class CreateGroupDto {
    gradeId;
    schoolYearId;
    name;
    maxStudents;
    schoolId;
}
exports.CreateGroupDto = CreateGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "gradeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "schoolYearId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "maxStudents", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "schoolId", void 0);
class UpdateGroupDto {
    gradeId;
    name;
    maxStudents;
}
exports.UpdateGroupDto = UpdateGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "gradeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateGroupDto.prototype, "maxStudents", void 0);
class AssignGroupTeacherDto {
    teacherProfileId;
    isHomeroom;
}
exports.AssignGroupTeacherDto = AssignGroupTeacherDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssignGroupTeacherDto.prototype, "teacherProfileId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AssignGroupTeacherDto.prototype, "isHomeroom", void 0);
class CreateSubjectDto {
    name;
    code;
    description;
}
exports.CreateSubjectDto = CreateSubjectDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSubjectDto.prototype, "description", void 0);
class UpdateSubjectDto {
    name;
    code;
    description;
}
exports.UpdateSubjectDto = UpdateSubjectDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSubjectDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSubjectDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSubjectDto.prototype, "description", void 0);
class AssignSubjectTeacherDto {
    teacherProfileId;
    groupId;
}
exports.AssignSubjectTeacherDto = AssignSubjectTeacherDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssignSubjectTeacherDto.prototype, "teacherProfileId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AssignSubjectTeacherDto.prototype, "groupId", void 0);
//# sourceMappingURL=academic.dto.js.map