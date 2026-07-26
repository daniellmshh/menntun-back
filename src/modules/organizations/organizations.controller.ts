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
import { RequestUser } from '../../common/types';
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
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener todas las organizaciones' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Obtener organización por ID' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: RequestUser) {
    return this.organizationsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar organización' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Post(':id/schools')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Asignar un plantel a la organización' })
  assignSchool(
    @Param('id') id: string,
    @Body() assignSchoolDto: AssignSchoolDto,
  ) {
    return this.organizationsService.assignSchool(id, assignSchoolDto);
  }

  @Delete(':id/schools/:schoolId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remover un plantel de la organización' })
  removeSchool(
    @Param('id') id: string,
    @Param('schoolId') schoolId: string,
  ) {
    return this.organizationsService.removeSchool(id, schoolId);
  }

  @Get(':id/schools')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Listar planteles de la organización' })
  getSchools(@Param('id') id: string, @CurrentUser() currentUser: RequestUser) {
    return this.organizationsService.getSchools(id, currentUser);
  }

  @Post(':id/admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear ORG_ADMIN para la organización' })
  createAdmin(
    @Param('id') id: string,
    @Body() createOrgAdminDto: CreateOrgAdminDto,
  ) {
    return this.organizationsService.createAdmin(id, createOrgAdminDto);
  }

  @Get(':id/reports/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Resumen consolidado de la organización' })
  getReportsSummary(
    @Param('id') id: string,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.organizationsService.getReportsSummary(id, currentUser);
  }
}
