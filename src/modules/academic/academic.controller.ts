import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AcademicService } from "./academic.service";
import {
  CreateGradeDto,
  UpdateGradeDto,
  CreateGroupDto,
  UpdateGroupDto,
  AssignGroupTeacherDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignSubjectTeacherDto,
  CreateSchoolYearDto,
  UpdateSchoolYearDto,
  CreatePeriodDto,
  UpdatePeriodDto,
  AssignGroupSubjectDto,
  BulkAssignStudentsDto,
} from "./academic.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Academic")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("academic")
@Controller("academic")
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ─── GRADES ────────────────────────────────────────────────────────

  @Get("grades")
  @ApiOperation({ summary: "List all grades for school (SUPER_ADMIN can filter by ?schoolId)" })
  async findAllGrades(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolId?: string,
  ) {
    const data = await this.academicService.findAllGrades(schoolId || (user.activeSchoolId || user.schoolId) as string, user);
    return successResponse(data);
  }

  @Get("grades/all")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List ALL grades across all schools (SUPER_ADMIN only)" })
  async findAllGradesAllSchools(@CurrentUser() user: RequestUser) {
    const data = await this.academicService.findAllGradesAllSchools(user);
    return successResponse(data);
  }

  @Post("grades")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Create grade (ADMIN only)" })
  async createGrade(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGradeDto,
  ) {
    const data = await this.academicService.createGrade((user.activeSchoolId || user.schoolId) as string, dto, user);
    return successResponse(data);
  }

  @Patch("grades/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update grade (ADMIN only)" })
  async updateGrade(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGradeDto,
  ) {
    const data = await this.academicService.updateGrade(id, dto, user);
    return successResponse(data);
  }

  @Delete("grades/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete grade (ADMIN only)" })
  async deleteGrade(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.deleteGrade(id, user);
    return successResponse(data);
  }

  // ─── SCHOOL YEARS ───────────────────────────────────────────────────

  @Get("school-years")
  @ApiOperation({ summary: "List school years (scoped by role; SUPER_ADMIN can filter by ?schoolId)" })
  async findAllSchoolYears(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolId?: string,
  ) {
    const data = await this.academicService.findAllSchoolYears(schoolId || (user.activeSchoolId || user.schoolId) as string, user);
    return successResponse(data);
  }

  @Get("school-years/all")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List ALL school years across all schools (SUPER_ADMIN only)" })
  async findAllSchoolYearsAllSchools(@CurrentUser() user: RequestUser) {
    const data = await this.academicService.findAllSchoolYearsAllSchools(user);
    return successResponse(data);
  }

  @Get("school-years/active")
  @ApiOperation({ summary: "Get active school year with periods" })
  async findActiveSchoolYear(@CurrentUser() user: RequestUser) {
    const data = await this.academicService.findActiveSchoolYear((user.activeSchoolId || user.schoolId) as string);
    return successResponse(data);
  }

  @Get("school-years/:id")
  @ApiOperation({ summary: "Get a school year by ID with its periods" })
  async findSchoolYearById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.findSchoolYearById(id, user);
    return successResponse(data);
  }

  @Post("school-years")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Create a school year (with optional periods)" })
  async createSchoolYear(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSchoolYearDto,
  ) {
    const data = await this.academicService.createSchoolYear(dto, user);
    return successResponse(data);
  }

  @Patch("school-years/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update a school year (name, dates, active status)" })
  async updateSchoolYear(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    const data = await this.academicService.updateSchoolYear(id, dto, user);
    return successResponse(data);
  }

  @Post("school-years/:id/close")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Close (deactivate) a school year" })
  async closeSchoolYear(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.closeSchoolYear(id, user);
    return successResponse(data);
  }

  @Delete("school-years/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete a school year (only if no groups assigned)" })
  async deleteSchoolYear(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.deleteSchoolYear(id, user);
    return successResponse(data);
  }

  // ─── PERIODS ──────────────────────────────────────────────────────

  @Post("school-years/:id/periods")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Add a period to a school year" })
  async addPeriod(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePeriodDto,
  ) {
    const data = await this.academicService.addPeriod(id, dto, user);
    return successResponse(data);
  }

  @Patch("school-years/:id/periods/:pid")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update a period" })
  async updatePeriod(
    @Param("id") id: string,
    @Param("pid") pid: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePeriodDto,
  ) {
    const data = await this.academicService.updatePeriod(id, pid, dto, user);
    return successResponse(data);
  }

  @Delete("school-years/:id/periods/:pid")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete a period (blocked if grade records exist)" })
  async deletePeriod(
    @Param("id") id: string,
    @Param("pid") pid: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.deletePeriod(id, pid, user);
    return successResponse(data);
  }

  // ─── GROUPS ────────────────────────────────────────────────────────

  @Get("groups")
  @ApiOperation({ summary: "List groups (optionally filtered by schoolYearId or schoolId)" })
  async findAllGroups(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolId?: string,
    @Query("schoolYearId") schoolYearId?: string,
    @Query("assignedToMe") assignedToMe?: string,
  ) {
    const data = await this.academicService.findAllGroups(schoolId || (user.activeSchoolId || user.schoolId) as string, schoolYearId, user, assignedToMe === "true");
    return successResponse(data);
  }

  @Get("groups/all")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "List ALL groups across all schools (SUPER_ADMIN only)" })
  async findAllGroupsAllSchools(@CurrentUser() user: RequestUser) {
    const data = await this.academicService.findAllGroupsAllSchools(user);
    return successResponse(data);
  }

  @Get("groups/:id")
  @ApiOperation({ summary: "Get group by id with teachers and enrollments count" })
  async findGroupById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.findGroupById(id, user);
    return successResponse(data);
  }

  @Post("groups")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Create group (ADMIN only)" })
  async createGroup(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGroupDto,
  ) {
    const data = await this.academicService.createGroup((user.activeSchoolId || user.schoolId) as string, dto, user);
    return successResponse(data);
  }

  @Patch("groups/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update group (ADMIN only)" })
  async updateGroup(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGroupDto,
  ) {
    const data = await this.academicService.updateGroup(id, dto, user);
    return successResponse(data);
  }

  @Delete("groups/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete group (ADMIN only)" })
  async removeGroup(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.removeGroup(id, user);
    return successResponse(data);
  }

  @Post("groups/:id/teachers")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Assign teacher to group (ADMIN only)" })
  async assignGroupTeacher(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignGroupTeacherDto,
  ) {
    const data = await this.academicService.assignGroupTeacher(id, dto, user);
    return successResponse(data);
  }

  @Delete("groups/:id/teachers/:tid")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Remove teacher from group (ADMIN only)" })
  async removeGroupTeacher(
    @Param("id") id: string,
    @Param("tid") tid: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.removeGroupTeacher(id, tid, user);
    return successResponse(data);
  }

  // ─── SUBJECTS ──────────────────────────────────────────────────────

  @Get("subjects")
  @ApiOperation({ summary: "List all subjects for school" })
  async findAllSubjects(@CurrentUser() user: RequestUser) {
    const data = await this.academicService.findAllSubjects((user.activeSchoolId || user.schoolId) as string);
    return successResponse(data);
  }

  @Get("subjects/:id")
  @ApiOperation({ summary: "Get subject by id with teacher assignments" })
  async findSubjectById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.findSubjectById(id, (user.activeSchoolId || user.schoolId) as string);
    return successResponse(data);
  }

  @Post("subjects")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Create subject (ADMIN only)" })
  async createSubject(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSubjectDto,
  ) {
    const data = await this.academicService.createSubject((user.activeSchoolId || user.schoolId) as string, dto, user);
    return successResponse(data);
  }

  @Patch("subjects/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Update subject (ADMIN only)" })
  async updateSubject(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSubjectDto,
  ) {
    const data = await this.academicService.updateSubject(id, (user.activeSchoolId || user.schoolId) as string, dto, user);
    return successResponse(data);
  }

  @Delete("subjects/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Delete subject (ADMIN only)" })
  async deleteSubject(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.deleteSubject(id, (user.activeSchoolId || user.schoolId) as string, user);
    return successResponse(data);
  }

  @Post("subjects/:id/teachers")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Assign teacher to subject (ADMIN only)" })
  async assignSubjectTeacher(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignSubjectTeacherDto,
  ) {
    const data = await this.academicService.assignSubjectTeacher(id, (user.activeSchoolId || user.schoolId) as string, dto, user);
    return successResponse(data);
  }

  @Delete("subjects/:id/teachers/:tid/:gid")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Remove teacher from subject assignment (ADMIN only)" })
  async removeSubjectTeacher(
    @Param("id") id: string,
    @Param("tid") tid: string,
    @Param("gid") gid: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.removeSubjectTeacher(id, tid, gid, (user.activeSchoolId || user.schoolId) as string, user);
    return successResponse(data);
  }

  // ─── GROUP SUBJECTS ────────────────────────────────────────────────

  @Get("groups/:id/subjects")
  @ApiOperation({ summary: "Get all subjects for the school, with assignment status for the group" })
  async getGroupSubjects(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.academicService.getGroupSubjects(id, user);
    return successResponse(data);
  }

  @Post("groups/:id/subjects")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Assign a subject to a group (ADMIN only)" })
  async assignGroupSubject(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignGroupSubjectDto,
  ) {
    const data = await this.academicService.assignGroupSubject(id, dto, user);
    return successResponse(data);
  }

  @Delete("groups/:id/subjects/:subjectId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Remove a subject from a group (ADMIN only)" })
  async removeGroupSubject(
    @Param("id") id: string,
    @Param("subjectId") subjectId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.removeGroupSubject(id, subjectId, user);
    return successResponse(data);
  }

  @Get("groups/:id/students")
  @ApiOperation({ summary: "Get assigned and available students for a group" })
  async getGroupAvailableStudents(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.academicService.getGroupAvailableStudents(id, user);
    return successResponse(data);
  }

  @Post("groups/:id/students/bulk")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Bulk assign students to a group (ADMIN only)" })
  async bulkAssignStudents(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAssignStudentsDto,
  ) {
    const data = await this.academicService.bulkAssignStudents(id, dto.students, user);
    return successResponse(data);
  }

  @Delete("groups/:id/students/:studentProfileId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Remove a student from a group (ADMIN only)" })
  async removeStudentFromGroup(
    @Param("id") id: string,
    @Param("studentProfileId") studentProfileId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.academicService.removeStudentFromGroup(id, studentProfileId, user);
    return successResponse(data);
  }
}
