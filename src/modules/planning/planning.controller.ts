import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { PlanningGenerationService } from "./planning-generation.service";
import { NemKnowledgeService } from "./nem-knowledge.service";
import { PlanningExportService } from "./planning-export.service";
import { GeneratePlanningDto, UpdatePlanningDto } from "./planning.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Planning")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("planning")
@Controller("planning")
export class PlanningController {
  constructor(
    private readonly planningService: PlanningGenerationService,
    private readonly nemKnowledgeService: NemKnowledgeService,
    private readonly planningExportService: PlanningExportService,
  ) {}

  @Post("generate")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Generar una planeación apoyada por IA y RAG (DRAFT)" })
  async generate(
    @Body() dto: GeneratePlanningDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.planningService.generatePlanning(dto, user);
    return successResponse({ planning: result.planning });
  }

  @Post("generate/stream")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Generar una planeación con SSE streaming en tiempo real" })
  async generateStream(
    @Body() dto: GeneratePlanningDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    await this.planningService.generatePlanningStream(dto, user, res);
  }

  @Get("teachers-list")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Obtener la lista de profesores de la escuela actual para asignación" })
  async getTeachersList(@CurrentUser() user: RequestUser) {
    const data = await this.planningService.getTeachersList(user.schoolId);
    return successResponse(data);
  }

  @Get("catalogo")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Obtener el catálogo completo de campos formativos y contenidos de la SEP junto con lo operativo" })
  async getCatalogo(@CurrentUser() currentUser: RequestUser) {
    const catalogo = this.planningService.getCatalogo(currentUser);
    return { data: catalogo, meta: null, error: null };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Listar todas las planeaciones accesibles por el usuario" })
  async findAll(@CurrentUser() user: RequestUser) {
    const data = await this.planningService.findAll(user);
    return successResponse(data);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Obtener el detalle de una planeación por ID" })
  async findById(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.planningService.findById(id, user);
    return successResponse(data);
  }

  @Get(":id/export/html")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Exportar planeación como documento HTML imprimible" })
  async exportHtml(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const html = await this.planningExportService.generateHtml(id, user);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="planeacion_${id}.html"`);
    res.send(html);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Actualizar campos editables de una planeación" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePlanningDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.planningService.update(id, dto, user);
    return successResponse(data);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Eliminar definitivamente una planeación" })
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.planningService.delete(id, user);
    return successResponse(data);
  }
}
