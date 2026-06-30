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
exports.UpdateStudentDto = exports.CreateStudentDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateStudentDto {
    email;
    password;
    firstName;
    lastName;
    phone;
    schoolId;
    enrollmentNumber;
    birthDate;
    gender;
    bloodType;
    address;
    groupId;
}
exports.CreateStudentDto = CreateStudentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: "student@school.com" }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "password123", minLength: 6 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "John" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: "Doe" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "+123456789" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "f45787e3-aea7-41b8-bc18-e39dc35dcdf6" }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "schoolId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "STU-2026-001" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "enrollmentNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "2010-05-15T00:00:00.000Z" }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.Gender, example: client_1.Gender.MALE }),
    (0, class_validator_1.IsEnum)(client_1.Gender),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "O+" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "bloodType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "123 Main St, Reykjavik" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "g45787e3-aea7-41b8-bc18-e39dc35dcdf6" }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "groupId", void 0);
class UpdateStudentDto {
    firstName;
    lastName;
    phone;
    active;
    enrollmentNumber;
    birthDate;
    gender;
    bloodType;
    address;
    groupId;
}
exports.UpdateStudentDto = UpdateStudentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "John" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "Doe" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "+123456789" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateStudentDto.prototype, "active", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "STU-2026-001" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "enrollmentNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "2010-05-15T00:00:00.000Z" }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "birthDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.Gender, example: client_1.Gender.MALE }),
    (0, class_validator_1.IsEnum)(client_1.Gender),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "O+" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "bloodType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "123 Main St, Reykjavik" }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: "g45787e3-aea7-41b8-bc18-e39dc35dcdf6" }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStudentDto.prototype, "groupId", void 0);
//# sourceMappingURL=students.dto.js.map