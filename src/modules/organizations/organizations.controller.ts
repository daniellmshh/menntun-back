import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AssignSchoolDto,
  CreateOrgAdminDto,
} from './dto/organization.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser, successResponse } from '../../common/types';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear nueva organización' })
  async create(@Body() createOrganizationDto: CreateOrganizationDto) {
    const data = await this.organizationsService.create(createOrganizationDto);
    return successResponse(data);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener todas las organizaciones' })
  async findAll() {
    const data = await this.organizationsService.findAll();
    return successResponse(data);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Obtener organización por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: RequestUser) {
    const data = await this.organizationsService.findOne(id, currentUser);
    return successResponse(data);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar organización' })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    const data = await this.organizationsService.update(id, updateOrganizationDto);
    return successResponse(data);
  }

  @Post(':id/schools')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Asignar un plantel a la organización' })
  async assignSchool(
    @Param('id') id: string,
    @Body() assignSchoolDto: AssignSchoolDto,
  ) {
    const data = await this.organizationsService.assignSchool(id, assignSchoolDto);
    return successResponse(data);
  }

  @Delete(':id/schools/:schoolId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remover un plantel de la organización' })
  async removeSchool(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
  ) {
    const data = await this.organizationsService.removeSchool(id, schoolId);
    return successResponse(data);
  }

  @Get(':id/schools')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Listar planteles de la organización' })
  async getSchools(@Param('id') id: string, @CurrentUser() currentUser: RequestUser) {
    const data = await this.organizationsService.getSchools(id, currentUser);
    return successResponse(data);
  }

  @Post(':id/admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear ORG_ADMIN para la organización' })
  async createAdmin(
    @Param('id') id: string,
    @Body() createOrgAdminDto: CreateOrgAdminDto,
  ) {
    const data = await this.organizationsService.createAdmin(id, createOrgAdminDto);
    return successResponse(data);
  }

  @Get(':id/reports/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Resumen consolidado de la organización' })
  async getReportsSummary(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    const data = await this.organizationsService.getReportsSummary(id, currentUser);
    return successResponse(data);
  }
}
