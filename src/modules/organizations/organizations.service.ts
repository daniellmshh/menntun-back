import * as common_1 from "@nestjs/common";
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '../../lib/prisma';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AssignSchoolDto,
  CreateOrgAdminDto,
} from './dto/organization.dto';
import { RequestUser } from '../../common/types';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class OrganizationsService {
  private supabaseAdmin;

  constructor(private configService: ConfigService) {
    this.supabaseAdmin = createClient(
      this.configService.get<string>('SUPABASE_URL') as string,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async create(dto: CreateOrganizationDto) {
    return prisma.organization.create({
      data: dto,
    });
  }

  async findAll() {
    return prisma.organization.findMany({
      include: {
        _count: {
          select: { schools: true, users: true },
        },
      },
    });
  }

  async findOne(id: string, currentUser: RequestUser) {
    if (currentUser.role === UserRole.ORG_ADMIN && currentUser.organizationId !== id) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        schools: true,
        users: {
          where: { role: UserRole.ORG_ADMIN },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true,
          }
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    return prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async assignSchool(orgId: string, dto: AssignSchoolDto) {
    const school = await prisma.school.findUnique({ where: { id: dto.schoolId } });
    if (!school) {
      throw new NotFoundException('Plantel no encontrado');
    }

    return prisma.school.update({
      where: { id: dto.schoolId },
      data: { organizationId: orgId },
    });
  }

  async removeSchool(orgId: string, schoolId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school || school.organizationId !== orgId) {
      throw new NotFoundException('Plantel no encontrado en esta organización');
    }

    return prisma.school.update({
      where: { id: schoolId },
      data: { organizationId: null },
    });
  }

  async getSchools(orgId: string, currentUser: RequestUser) {
    if (currentUser.role === UserRole.ORG_ADMIN && currentUser.organizationId !== orgId) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }

    return prisma.school.findMany({
      where: { organizationId: orgId },
    });
  }

  async createAdmin(orgId: string, dto: CreateOrgAdminDto) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // 1. Invitar usuario en Supabase
    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(dto.email, {
      data: {
        first_name: dto.firstName,
        last_name: dto.lastName,
      },
    });

    if (authError || !authData.user) {
      throw new common_1.BadRequestException('Error al crear usuario en autenticación: ' + authError?.message);
    }

    // 2. Crear usuario en DB con ORG_ADMIN (schoolId: null)
    const newUser = await prisma.user.create({
      data: {
        email: dto.email,
        supabaseUid: authData.user.id,
        role: UserRole.ORG_ADMIN,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        organizationId: orgId,
      },
    });

    return newUser;
  }

  async getReportsSummary(orgId: string, currentUser: RequestUser) {
    if (currentUser.role === UserRole.ORG_ADMIN && currentUser.organizationId !== orgId) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }
    
    // Aquí podemos agregar consolidación de datos (ej. conteo de alumnos en todos los planteles)
    const schools = await prisma.school.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true }
    });

    const schoolIds = schools.map(s => s.id);

    const [studentsCount, teachersCount, enrollmentsCount] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.STUDENT, schoolId: { in: schoolIds } } }),
      prisma.user.count({ where: { role: UserRole.TEACHER, schoolId: { in: schoolIds } } }),
      prisma.enrollment.count({ where: { group: { schoolId: { in: schoolIds } } } })
    ]);

    return {
      totalSchools: schools.length,
      totalStudents: studentsCount,
      totalTeachers: teachersCount,
      totalEnrollments: enrollmentsCount,
    };
  }
}
