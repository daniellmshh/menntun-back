import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { PlanningGenerationService } from "./planning-generation.service";
import { NemKnowledgeService } from "./nem-knowledge.service";
import { GeneratePlanningDto, UpdatePlanningDto } from "./planning.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@ApiTags("Planning")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("planning")
export class PlanningController {
  constructor(
    private readonly planningService: PlanningGenerationService,
    private readonly nemKnowledgeService: NemKnowledgeService,
  ) {}

  @Post("generate")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Generar una planeación apoyada por IA y RAG (DRAFT)" })
  async generate(
    @Body() dto: GeneratePlanningDto,
    @CurrentUser() user: RequestUser,
  ) {
    const { planning, sugerenciaIA } = await this.planningService.generatePlanning(dto, user);
    return successResponse({ planning, sugerenciaIA });
  }

  @Get("teachers-list")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Obtener la lista de profesores de la escuela actual para asignación" })
  async getTeachersList(@CurrentUser() user: RequestUser) {
    const data = await this.planningService.getTeachersList(user.schoolId);
    return successResponse(data);
  }

  @Get("curriculum-catalog")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Obtener el catálogo completo de campos formativos y contenidos de la SEP" })
  getCurriculumCatalog() {
    const data = this.nemKnowledgeService.getCurriculumCatalog();
    return successResponse(data);
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
