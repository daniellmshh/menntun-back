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
import { ParentsService } from "./parents.service";
import { CreateParentDto, UpdateParentDto, LinkStudentDto } from "./parents.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ModulesGuard } from "../../common/guards/modules.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireModule } from "../../common/decorators/require-module.decorator";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser } from "../../common/types";

@Controller("parents")
@UseGuards(JwtAuthGuard, RolesGuard, ModulesGuard)
@RequireModule("parents")
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async findAll(@CurrentUser() user: RequestUser, @Query("schoolId") schoolId?: string) {
    const data = await this.parentsService.findAll(user, schoolId);
    return { data };
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async findOne(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    const data = await this.parentsService.findOne(id, user);
    return { data };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateParentDto) {
    const data = await this.parentsService.create(dto, user);
    return { data, message: "Padre/Tutor creado exitosamente e invitado por correo" };
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async update(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateParentDto,
  ) {
    const data = await this.parentsService.update(id, dto, user);
    return { data, message: "Información del padre actualizada" };
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    await this.parentsService.remove(id, user);
    return { message: "Padre/Tutor eliminado del sistema" };
  }

  @Post(":id/students")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async linkStudent(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: LinkStudentDto,
  ) {
    const data = await this.parentsService.linkStudent(id, dto, user);
    return { data, message: "Alumno vinculado correctamente" };
  }

  @Delete(":id/students/:studentId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  async unlinkStudent(
    @Param("id") id: string,
    @Param("studentId") studentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.parentsService.unlinkStudent(id, studentId, user);
    return { message: "Vinculación eliminada" };
  }
}
