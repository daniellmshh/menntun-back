import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { EnrollmentsService } from "./enrollments.service";
import { CreateSolicitudDto, ChangeDocumentoStatusDto, AprobarSolicitudDto, RejectSolicitudDto } from "./enrollments.dto";
import { CreateTipoDocumentoDto, UpdateTipoDocumentoDto } from "../finances/finances.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@Controller("enrollments")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query("schoolId") schoolId?: string,
  ) {
    const data = await this.enrollmentsService.findAll(user, schoolId as string);
    return successResponse(data);
  }

  @Get("capacity")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async getCapacity(
    @CurrentUser() user: RequestUser,
    @Query("schoolYearId") schoolYearId?: string,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.getCapacity(schoolId, schoolYearId);
    return successResponse(data);
  }

  // ─── TIPOS DE DOCUMENTO ───────────────────────────────

  @Get("tipos-documento")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @RequireModule("documents")
  async getTiposDocumento(@CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.getTiposDocumento(schoolId);
    return successResponse(data);
  }

  @Post("tipos-documento")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @RequireModule("documents")
  async createTipoDocumento(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTipoDocumentoDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.createTipoDocumento(schoolId, dto);
    return successResponse(data, { message: "Tipo de documento creado" });
  }

  @Patch("tipos-documento/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @RequireModule("documents")
  async updateTipoDocumento(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateTipoDocumentoDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.updateTipoDocumento(id, schoolId, dto);
    return successResponse(data, { message: "Tipo de documento actualizado" });
  }

  @Delete("tipos-documento/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @RequireModule("documents")
  async deleteTipoDocumento(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.deleteTipoDocumento(id, schoolId);
    return successResponse(data, { message: "Tipo de documento eliminado" });
  }

  // ─── SOLICITUDES ───────────────────────────────────────


  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async createDraft(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSolicitudDto,
  ) {
    // Para simplificar, la escuela la asume el admin o requiere que SUPER_ADMIN pase un DTO distinto
    // En este caso forzamos al schoolId del admin (asumiendo que SUPER_ADMIN opera bajo contexto si no manda otro)
    const schoolId = (user.activeSchoolId || user.schoolId) as string; 
    const data = await this.enrollmentsService.createDraft(dto, schoolId as string);
    return successResponse(data);
  }

  @Patch(":id/submit")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async submit(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.enrollmentsService.submit(id, (user.activeSchoolId || user.schoolId) as string as string);
    return successResponse(data, { message: "Solicitud enviada" });
  }

  @Patch(":id/in-review")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async markInReview(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.enrollmentsService.markInReview(id, (user.activeSchoolId || user.schoolId) as string as string);
    return successResponse(data, { message: "Solicitud en revisión" });
  }

  @Patch("documents/:docId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateDocumento(
    @Param("docId") docId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangeDocumentoStatusDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.updateDocumento(docId, schoolId, dto);
    return successResponse(data, { message: "Estado de documento actualizado" });
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async approve(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AprobarSolicitudDto,
  ) {
    const data = await this.enrollmentsService.approve(id, (user.activeSchoolId || user.schoolId) as string, dto);
    return successResponse(data, { message: "Solicitud aprobada y estudiante matriculado" });
  }

  @Patch(":id/reject")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async reject(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: RejectSolicitudDto,
  ) {
    const data = await this.enrollmentsService.reject(id, (user.activeSchoolId || user.schoolId) as string, dto.motivoRechazo);
    return successResponse(data, { message: "Solicitud rechazada" });
  }

  @Delete(":id/cancel")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async cancel(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body("reason") reason: string,
  ) {
    const data = await this.enrollmentsService.cancel(id, (user.activeSchoolId || user.schoolId) as string, reason);
    return successResponse(data, { message: "Inscripción cancelada y reversada" });
  }

  @Get(":id/documents")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async getDocuments(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.getDocuments(id, schoolId);
    return successResponse(data);
  }

  @Post(":id/documents")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body("tipoDocumentoId") tipoDocumentoId: string,
    @UploadedFile() file: any,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.enrollmentsService.uploadDocument(id, schoolId, tipoDocumentoId, file);
    return successResponse(data, { message: "Documento subido correctamente" });
  }
}
