import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RequestUser, successResponse } from "../../common/types";
import {
  CreateEvaluationCategoryDto,
  CreateEvaluationDto,
  UpdateEvaluationCategoryDto,
  UpdateEvaluationDto,
  UpsertEvaluationScoresDto,
  UpsertGradingPolicyDto,
} from "./grades.dto";
import { GradesService } from "./grades.service";

@ApiTags("Grades")
@ApiBearerAuth()
@Controller("grades")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("grades")
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get("categories")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "List the school's evaluation categories" })
  async getCategories(@CurrentUser() user: RequestUser) { return successResponse(await this.gradesService.getCategories(user)); }

  @Post("categories")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCategory(@CurrentUser() user: RequestUser, @Body() dto: CreateEvaluationCategoryDto) { return successResponse(await this.gradesService.createCategory(user, dto)); }

  @Patch("categories/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateCategory(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateEvaluationCategoryDto) { return successResponse(await this.gradesService.updateCategory(id, user, dto)); }

  @Get("policies")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getPolicy(@CurrentUser() user: RequestUser, @Query("groupId") groupId: string, @Query("subjectId") subjectId: string, @Query("periodId") periodId: string) { return successResponse(await this.gradesService.getGradingPolicy(user, groupId, subjectId, periodId)); }

  @Post("policies")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async upsertPolicy(@CurrentUser() user: RequestUser, @Body() dto: UpsertGradingPolicyDto) { return successResponse(await this.gradesService.upsertGradingPolicy(user, dto)); }

  @Get("evaluations")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async listEvaluations(@CurrentUser() user: RequestUser, @Query("groupId") groupId: string, @Query("subjectId") subjectId?: string, @Query("periodId") periodId?: string) { return successResponse(await this.gradesService.listEvaluations(user, groupId, subjectId, periodId)); }

  @Post("evaluations")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async createEvaluation(@CurrentUser() user: RequestUser, @Body() dto: CreateEvaluationDto) { return successResponse(await this.gradesService.createEvaluation(user, dto)); }

  @Get("evaluations/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getEvaluation(@Param("id") id: string, @CurrentUser() user: RequestUser) { return successResponse(await this.gradesService.getEvaluation(id, user)); }

  @Patch("evaluations/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async updateEvaluation(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateEvaluationDto) { return successResponse(await this.gradesService.updateEvaluation(id, user, dto)); }

  @Post("evaluations/:id/scores")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async upsertScores(@Param("id") id: string, @CurrentUser() user: RequestUser, @Body() dto: UpsertEvaluationScoresDto) { return successResponse(await this.gradesService.upsertScores(id, user, dto)); }

  @Get("students/:studentProfileId/summary")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.TUTOR, UserRole.STUDENT)
  async getStudentSummary(@Param("studentProfileId") studentProfileId: string, @Query("periodId") periodId: string, @CurrentUser() user: RequestUser) { return successResponse(await this.gradesService.getStudentPeriodSummary(user, studentProfileId, periodId)); }
}
