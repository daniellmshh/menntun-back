import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Delete,
} from "@nestjs/common";
import { EnrollmentsService } from "./enrollments.service";
import { CreateSolicitudDto, ChangeDocumentoStatusDto, AprobarSolicitudDto } from "./enrollments.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser } from "../../common/types";

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
    const data = await this.enrollmentsService.findAll(user, schoolId);
    return { data };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async createDraft(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSolicitudDto,
  ) {
    // Para simplificar, la escuela la asume el admin o requiere que SUPER_ADMIN pase un DTO distinto
    // En este caso forzamos al schoolId del admin (asumiendo que SUPER_ADMIN opera bajo contexto si no manda otro)
    const schoolId = user.schoolId; 
    const data = await this.enrollmentsService.createDraft(dto, schoolId);
    return { data };
  }

  @Patch(":id/submit")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async submit(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.enrollmentsService.submit(id, user.schoolId);
    return { data, message: "Solicitud enviada" };
  }

  @Patch(":id/in-review")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async markInReview(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.enrollmentsService.markInReview(id, user.schoolId);
    return { data, message: "Solicitud en revisión" };
  }

  @Patch("documents/:docId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateDocumento(
    @Param("docId") docId: string,
    @Body() dto: ChangeDocumentoStatusDto,
  ) {
    const data = await this.enrollmentsService.updateDocumento(docId, dto);
    return { data, message: "Estado de documento actualizado" };
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async approve(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: AprobarSolicitudDto,
  ) {
    const data = await this.enrollmentsService.approve(id, user.schoolId, dto);
    return { data, message: "Solicitud aprobada y estudiante matriculado" };
  }

  @Patch(":id/reject")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async reject(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body("reason") reason: string,
  ) {
    const data = await this.enrollmentsService.reject(id, user.schoolId, reason);
    return { data, message: "Solicitud rechazada" };
  }

  @Delete(":id/cancel")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async cancel(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body("reason") reason: string,
  ) {
    const data = await this.enrollmentsService.cancel(id, user.schoolId, reason);
    return { data, message: "Inscripción cancelada y reversada" };
  }
}
