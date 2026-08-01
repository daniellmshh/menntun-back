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
} from "@nestjs/common";
import { FinancesService } from "./finances.service";
import {
  CreateCatalogoCargoDto,
  UpdateCatalogoCargoDto,
  CreateCargoDto,
  UpdateCargoDto,
  CreatePagoDto,
} from "./finances.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser } from "../../common/types";

@Controller("finances")
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule("finances")
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  // ─── Catálogo de Cargos ────────────────────────────────

  @Get("catalogo")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async getCatalogo(@CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.getCatalogo(schoolId);
    return { data };
  }

  @Post("catalogo")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCatalogoCargo(@CurrentUser() user: RequestUser, @Body() dto: CreateCatalogoCargoDto) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.createCatalogoCargo(schoolId, dto);
    return { data, message: "Cargo agregado al catálogo" };
  }

  @Patch("catalogo/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateCatalogoCargo(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCatalogoCargoDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.updateCatalogoCargo(id, schoolId, dto);
    return { data, message: "Cargo del catálogo actualizado" };
  }

  @Delete("catalogo/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async deleteCatalogoCargo(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.deleteCatalogoCargo(id, schoolId);
    return { data, message: "Cargo eliminado del catálogo" };
  }

  // ─── Cargos (Cuenta por Cobrar) ────────────────────────

  @Get("cargos")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async getCargos(
    @CurrentUser() user: RequestUser,
    @Query("studentProfileId") studentProfileId?: string,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.getCargos(schoolId, studentProfileId);
    return { data };
  }

  @Post("cargos")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCargo(@CurrentUser() user: RequestUser, @Body() dto: CreateCargoDto) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.createCargo(schoolId, dto);
    return { data, message: "Cargo asignado al estudiante" };
  }

  @Patch("cargos/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateCargo(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCargoDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.updateCargo(id, schoolId, dto);
    return { data, message: "Cargo actualizado" };
  }

  @Delete("cargos/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async deleteCargo(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.deleteCargo(id, schoolId);
    return { data, message: "Cargo eliminado" };
  }

  // ─── Pagos ─────────────────────────────────────────────

  @Post("cargos/:id/pagos")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async registerPago(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePagoDto,
  ) {
    const schoolId = (user.activeSchoolId || user.schoolId) as string;
    const data = await this.financesService.registerPago(id, schoolId, dto, user);
    return { data, message: "Pago registrado correctamente" };
  }
}
