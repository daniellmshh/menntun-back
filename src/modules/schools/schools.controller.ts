import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { SchoolsService } from "./schools.service";
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  UpdateModulesDto,
  CreateSchoolUserDto,
  UpdateSchoolUserDto,
} from "./schools.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Schools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // SUPER_ADMIN: list all schools
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List all schools (SUPER_ADMIN only)" })
  async findAll() {
    const data = await this.schoolsService.findAll();
    return successResponse(data);
  }

  // SUPER_ADMIN: create new school
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create a new school (SUPER_ADMIN only)" })
  async create(@Body() dto: CreateSchoolDto) {
    const data = await this.schoolsService.create(dto);
    return successResponse(data);
  }

  // Any authenticated user: get their own school
  @Get("me")
  @ApiOperation({ summary: "Get current user school details" })
  async findMySchool(@CurrentUser() user: RequestUser) {
    const data = await this.schoolsService.findMySchool(user);
    return successResponse(data);
  }

  // Any authenticated user: get their school stats
  @Get("me/stats")
  @ApiOperation({ summary: "Get stats for current user school" })
  async getStats(@CurrentUser() user: RequestUser) {
    const data = await this.schoolsService.getStats(user);
    return successResponse(data);
  }

  // Get school by id (scoped by role)
  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Get school by id" })
  async findById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.findById(id, user);
    return successResponse(data);
  }

  // Update school
  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update school details" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.update(id, dto, user);
    return successResponse(data);
  }

  // Get modules for a school
  @Get(":id/modules")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Get module status for a school" })
  async getModules(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.getModules(id, user);
    return successResponse(data);
  }

  // Enable or disable modules for a school
  @Patch(":id/modules")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Enable or disable modules (SUPER_ADMIN only)" })
  async updateModules(
    @Param("id") id: string,
    @Body() dto: UpdateModulesDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.updateModules(id, dto, user);
    return successResponse(data);
  }

  // ─── USER ASSIGNMENT & MANAGEMENT ───────────────────────────────────
  @Get(":id/users")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Get all users of a school" })
  async findUsers(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.findUsers(id, user);
    return successResponse(data);
  }

  @Post(":id/users")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Create a user in a school" })
  async createUser(
    @Param("id") id: string,
    @Body() dto: CreateSchoolUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.createUser(id, dto, user);
    return successResponse(data);
  }

  @Patch(":id/users/:userId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update a user in a school" })
  async updateUser(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateSchoolUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.schoolsService.updateUser(id, userId, dto, user);
    return successResponse(data);
  }
}
