import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { TeachersService } from "./teachers.service";
import { CreateTeacherDto, UpdateTeacherDto } from "./teachers.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Teachers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("teachers")
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "List teachers (SUPER_ADMIN lists all or filters, SCHOOL_ADMIN/TEACHER lists school-scoped)" })
  @ApiQuery({ name: "schoolId", required: false, description: "Filter by school ID (SUPER_ADMIN only)" })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolIdFilter?: string,
  ) {
    const data = await this.teachersService.findAll(user, schoolIdFilter);
    return successResponse(data);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Get teacher details by ID" })
  async findById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.teachersService.findById(id, user);
    return successResponse(data);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Register a new teacher (ADMIN only)" })
  async create(
    @Body() dto: CreateTeacherDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.teachersService.create(dto, user);
    return successResponse(data);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update teacher information and permissions (ADMIN only)" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTeacherDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.teachersService.update(id, dto, user);
    return successResponse(data);
  }
}
