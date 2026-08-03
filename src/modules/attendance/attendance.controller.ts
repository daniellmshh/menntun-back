import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RequestUser, successResponse } from "../../common/types";
import { AttendanceService } from "./attendance.service";
import { CreateClassSessionDto, CreatePickupContactDto, CreatePushSubscriptionDto, DailyAttendanceReportQueryDto, ReopenDailyAttendanceDto, ResolveCredentialDto, ScanAttendanceDto, UpdateAttendanceSettingsDto, UpdatePickupContactDto, UpsertClassAttendanceDto } from "./attendance.dto";

const ADMINS = [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SCHOOL_ADMIN];
const GATE_USERS = [...ADMINS, UserRole.ATTENDANCE_OPERATOR];

@ApiTags("Attendance")
@ApiBearerAuth()
@Controller("attendance")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("settings")
  @Roles(...GATE_USERS)
  @ApiOperation({ summary: "Get the active school's attendance settings" })
  async getSettings(@CurrentUser() user: RequestUser) { return successResponse(await this.attendanceService.getSettings(user)); }

  @Patch("settings")
  @Roles(...ADMINS)
  async updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAttendanceSettingsDto) { return successResponse(await this.attendanceService.updateSettings(user, dto)); }

  @Post("students/:studentProfileId/credential")
  @Roles(...ADMINS)
  async issueCredential(@CurrentUser() user: RequestUser, @Param("studentProfileId") studentProfileId: string) { return successResponse(await this.attendanceService.issueCredential(user, studentProfileId)); }

  @Post("credentials/:id/revoke")
  @Roles(...ADMINS)
  async revokeCredential(@CurrentUser() user: RequestUser, @Param("id") id: string) { return successResponse(await this.attendanceService.revokeCredential(user, id)); }

  @Get("students/:studentProfileId/pickup-contacts")
  @Roles(...GATE_USERS)
  async listPickupContacts(@CurrentUser() user: RequestUser, @Param("studentProfileId") studentProfileId: string) { return successResponse(await this.attendanceService.listPickupContacts(user, studentProfileId)); }

  @Post("pickup-contacts")
  @Roles(...ADMINS)
  async createPickupContact(@CurrentUser() user: RequestUser, @Body() dto: CreatePickupContactDto) { return successResponse(await this.attendanceService.createPickupContact(user, dto)); }

  @Patch("pickup-contacts/:id")
  @Roles(...ADMINS)
  async updatePickupContact(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePickupContactDto) { return successResponse(await this.attendanceService.updatePickupContact(user, id, dto)); }

  @Post("pickup-contacts/:id/photo")
  @Roles(...ADMINS)
  @UseInterceptors(FileInterceptor("file"))
  async uploadPickupPhoto(@CurrentUser() user: RequestUser, @Param("id") id: string, @UploadedFile() file: { mimetype: string; size: number; buffer: Buffer }) { return successResponse(await this.attendanceService.uploadPickupPhoto(user, id, file)); }

  @Get("pickup-contacts/:id/photo")
  @Roles(...GATE_USERS)
  async pickupPhoto(@CurrentUser() user: RequestUser, @Param("id") id: string) { return successResponse(await this.attendanceService.pickupPhotoUrl(user, id)); }

  @Post("scan")
  @Roles(...GATE_USERS)
  @ApiOperation({ summary: "Register a gate QR event. The client event id makes mobile retries idempotent." })
  async scan(@CurrentUser() user: RequestUser, @Body() dto: ScanAttendanceDto) { return successResponse(await this.attendanceService.scan(user, dto)); }

  @Post("resolve-credential")
  @Roles(...GATE_USERS)
  @ApiOperation({ summary: "Resolve an attendance QR before selecting its gate operation" })
  async resolveCredential(@CurrentUser() user: RequestUser, @Body() dto: ResolveCredentialDto) { return successResponse(await this.attendanceService.resolveCredential(user, dto.qrPayload)); }

  @Get("live")
  @Roles(...GATE_USERS)
  async live(@CurrentUser() user: RequestUser, @Query("date") date?: string) { return successResponse(await this.attendanceService.live(user, date)); }

  @Get("reports/daily")
  @Roles(...ADMINS)
  async dailyReport(@CurrentUser() user: RequestUser, @Query() query: DailyAttendanceReportQueryDto) { return successResponse(await this.attendanceService.dailyReport(user, query)); }

  @Get("students/:studentProfileId/timeline")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.ATTENDANCE_OPERATOR, UserRole.TEACHER, UserRole.PARENT, UserRole.TUTOR, UserRole.STUDENT)
  async timeline(@CurrentUser() user: RequestUser, @Param("studentProfileId") studentProfileId: string) { return successResponse(await this.attendanceService.timeline(user, studentProfileId)); }

  @Post("class-sessions")
  @Roles(...ADMINS, UserRole.TEACHER)
  async createSession(@CurrentUser() user: RequestUser, @Body() dto: CreateClassSessionDto) { return successResponse(await this.attendanceService.createSession(user, dto)); }

  @Get("class-sessions/:id")
  @Roles(...ADMINS, UserRole.TEACHER)
  async getSession(@CurrentUser() user: RequestUser, @Param("id") id: string) { return successResponse(await this.attendanceService.getSession(user, id)); }

  @Post("class-sessions/:id/records")
  @Roles(...ADMINS, UserRole.TEACHER)
  async markSession(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpsertClassAttendanceDto) { return successResponse(await this.attendanceService.markSession(user, id, dto)); }

  @Post("daily/:date/reopen")
  @Roles(...ADMINS)
  async reopenDay(@CurrentUser() user: RequestUser, @Param("date") date: string, @Body() dto: ReopenDailyAttendanceDto) { return successResponse(await this.attendanceService.reopenDay(user, date, dto)); }

  @Get("family")
  @Roles(UserRole.PARENT, UserRole.TUTOR, UserRole.STUDENT)
  async familyAttendance(@CurrentUser() user: RequestUser, @Query("studentProfileId") studentProfileId?: string) { return successResponse(await this.attendanceService.familyAttendance(user, studentProfileId)); }

  @Get("push/public-key")
  @Roles(UserRole.PARENT, UserRole.TUTOR)
  async pushPublicKey() { return successResponse(this.attendanceService.pushPublicKey()); }

  @Post("push/subscriptions")
  @Roles(UserRole.PARENT, UserRole.TUTOR)
  async subscribePush(@CurrentUser() user: RequestUser, @Body() dto: CreatePushSubscriptionDto) { return successResponse(await this.attendanceService.upsertPushSubscription(user, dto)); }

  @Delete("push/subscriptions")
  @Roles(UserRole.PARENT, UserRole.TUTOR)
  async unsubscribePush(@CurrentUser() user: RequestUser, @Body("endpoint") endpoint: string) { return successResponse(await this.attendanceService.removePushSubscription(user, endpoint)); }
}
