import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { StudentsService } from "./students.service";
import { CreateStudentDto, UpdateStudentDto } from "./students.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Students")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "List students (SUPER_ADMIN lists all/filters, ADMIN/TEACHER lists school-scoped)" })
  @ApiQuery({ name: "schoolId", required: false, description: "Filter by school ID (SUPER_ADMIN only)" })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolIdFilter?: string,
  ) {
    const data = await this.studentsService.findAll(user, schoolIdFilter);
    return successResponse(data);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get student details by ID" })
  async findById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.studentsService.findById(id, user);
    return successResponse(data);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Register a new student (ADMIN only)" })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.studentsService.create(dto, user);
    return successResponse(data);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update student profile information (ADMIN only)" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.studentsService.update(id, dto, user);
    return successResponse(data);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete student profile and auth account (ADMIN only)" })
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.studentsService.delete(id, user);
    return successResponse(data);
  }
}
