import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaClient, UserRole, SolicitudEstado, DocumentoEstado } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { RequestUser } from "../../common/types";
import { CreateSolicitudDto, ChangeDocumentoStatusDto, AprobarSolicitudDto } from "./enrollments.dto";
import * as crypto from "crypto";

@Injectable()
export class EnrollmentsService {
  private readonly supabaseAdmin;

  constructor(
    private readonly configService: ConfigService,
    @Inject("PRISMA") private readonly prisma: PrismaClient,
  ) {
    const supabaseUrl = this.configService.get<string>("supabase.url") || "";
    const serviceRoleKey = this.configService.get<string>("supabase.serviceRoleKey") || "";
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async findAll(currentUser: RequestUser, schoolIdFilter?: string) {
    let targetSchoolId = currentUser.role === UserRole.SUPER_ADMIN ? schoolIdFilter : currentUser.schoolId;

    const whereClause: any = {};
    if (targetSchoolId) {
      whereClause.schoolId = targetSchoolId;
    }

    return this.prisma.solicitudInscripcion.findMany({
      where: whereClause,
      include: {
        schoolYear: true,
        studentProfile: { include: { user: true } },
        documentos: true,
        padres: true,
        cargos: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDraft(dto: CreateSolicitudDto, schoolId: string) {
    return this.prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitudInscripcion.create({
        data: {
          schoolId,
          schoolYearId: dto.schoolYearId,
          studentProfileId: dto.studentProfileId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender,
          bloodType: dto.bloodType,
          address: dto.address,
          nivelEducativo: dto.nivelEducativo,
          gradoPropuesto: dto.gradoPropuesto,
          estado: SolicitudEstado.DRAFT,
        },
      });

      if (dto.padres && dto.padres.length > 0) {
        await tx.datosPadreSolicitud.createMany({
          data: dto.padres.map((p) => ({
            solicitudInscripcionId: solicitud.id,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
            relationship: p.relationship,
          })),
        });
      }

      return solicitud;
    });
  }

  async submit(id: string, schoolId: string) {
    return this.prisma.solicitudInscripcion.updateMany({
      where: { id, schoolId, estado: SolicitudEstado.DRAFT },
      data: { estado: SolicitudEstado.SUBMITTED },
    });
  }

  async markInReview(id: string, schoolId: string) {
    return this.prisma.solicitudInscripcion.updateMany({
      where: { id, schoolId, estado: SolicitudEstado.SUBMITTED },
      data: { estado: SolicitudEstado.EN_REVISION },
    });
  }

  async updateDocumento(docId: string, dto: ChangeDocumentoStatusDto) {
    return this.prisma.documentoSolicitud.update({
      where: { id: docId },
      data: {
        estado: dto.estado as DocumentoEstado,
        observaciones: dto.observaciones,
      },
    });
  }

  async approve(id: string, schoolId: string, dto: AprobarSolicitudDto) {
    const solicitud = await this.prisma.solicitudInscripcion.findUnique({
      where: { id },
      include: { padres: true, documentos: true },
    });

    if (!solicitud || solicitud.schoolId !== schoolId) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    if (solicitud.estado === SolicitudEstado.APROBADA || solicitud.estado === SolicitudEstado.MATRICULADO) {
      throw new BadRequestException("La solicitud ya está aprobada");
    }

    // Verificar documentos
    const pendingDocs = solicitud.documentos.filter((d) => d.estado !== DocumentoEstado.VALIDADO);
    if (pendingDocs.length > 0) {
      throw new BadRequestException("No se puede aprobar la solicitud porque hay documentos pendientes o rechazados");
    }

    // Transacción masiva
    return this.prisma.$transaction(async (tx) => {
      let finalStudentProfileId = solicitud.studentProfileId;

      // 1. Crear alumno si no existe (No es reinscripción)
      if (!finalStudentProfileId) {
        const fakeEmail = `student_${crypto.randomUUID()}@menntun.internal`;
        const fakePassword = crypto.randomUUID();

        const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
          email: fakeEmail,
          password: fakePassword,
          email_confirm: true,
          user_metadata: { schoolId, role: UserRole.STUDENT, firstName: solicitud.firstName, lastName: solicitud.lastName },
        });

        if (authError || !authData?.user) {
          throw new BadRequestException("Error creando usuario de estudiante en Supabase");
        }

        const user = await tx.user.create({
          data: {
            supabaseUid: authData.user.id,
            email: fakeEmail,
            schoolId,
            role: UserRole.STUDENT,
            firstName: solicitud.firstName,
            lastName: solicitud.lastName,
          },
        });

        const profile = await tx.studentProfile.create({
          data: {
            userId: user.id,
            birthDate: solicitud.birthDate,
            gender: solicitud.gender,
            bloodType: solicitud.bloodType,
            address: solicitud.address,
          },
        });
        finalStudentProfileId = profile.id;

        // Ligar la solicitud al nuevo perfil
        await tx.solicitudInscripcion.update({
          where: { id: solicitud.id },
          data: { studentProfileId: finalStudentProfileId },
        });
      }

      // 2. Procesar Padres (Deduplicación)
      for (const p of solicitud.padres) {
        let parentUser = await tx.user.findFirst({
          where: { schoolId, email: p.email, role: UserRole.PARENT },
          include: { parentProfile: true },
        });

        let parentProfileId: string;

        if (!parentUser) {
          // Crear en Supabase (solo se invita)
          const { data: inviteData, error: inviteError } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(p.email, {
            data: { schoolId, role: UserRole.PARENT, firstName: p.firstName, lastName: p.lastName },
          });

          if (inviteError || !inviteData?.user) {
            throw new BadRequestException(`Error invitando al padre ${p.email} en Supabase`);
          }

          const newUser = await tx.user.create({
            data: {
              supabaseUid: inviteData.user.id,
              email: p.email,
              schoolId,
              role: UserRole.PARENT,
              firstName: p.firstName,
              lastName: p.lastName,
              phone: p.phone,
            },
          });

          const newProfile = await tx.parentProfile.create({
            data: { userId: newUser.id },
          });

          parentProfileId = newProfile.id;
        } else {
          parentProfileId = parentUser.parentProfile!.id;
        }

        // Crear la relación (ignorar si ya existe)
        const existingLink = await tx.parentStudent.findUnique({
          where: { parentProfileId_studentProfileId: { parentProfileId, studentProfileId: finalStudentProfileId } },
        });
        if (!existingLink) {
          await tx.parentStudent.create({
            data: {
              parentProfileId,
              studentProfileId: finalStudentProfileId,
              relationship: p.relationship,
              isPrimary: p.isPrimary,
            },
          });
        }
      }

      // 3. Generar Cargos
      if (dto.cargos && dto.cargos.length > 0) {
        await tx.cargoInscripcion.createMany({
          data: dto.cargos.map((c) => ({
            studentProfileId: finalStudentProfileId!,
            schoolYearId: solicitud.schoolYearId,
            solicitudInscripcionId: solicitud.id,
            concepto: c.concepto,
            monto: c.monto,
            fechaVencimiento: new Date(c.fechaVencimiento),
          })),
        });
      }

      // 4. Cambiar estado a APROBADA
      return tx.solicitudInscripcion.update({
        where: { id: solicitud.id },
        data: { estado: SolicitudEstado.APROBADA },
      });
    });
  }

  async reject(id: string, schoolId: string, reason: string) {
    return this.prisma.solicitudInscripcion.updateMany({
      where: { id, schoolId },
      data: { estado: SolicitudEstado.RECHAZADA, cancelationReason: reason },
    });
  }

  async cancel(id: string, schoolId: string, reason: string) {
    const solicitud = await this.prisma.solicitudInscripcion.findUnique({
      where: { id },
    });

    if (!solicitud || solicitud.schoolId !== schoolId) {
      throw new NotFoundException("Solicitud no encontrada");
    }
    
    if (solicitud.estado !== SolicitudEstado.APROBADA && solicitud.estado !== SolicitudEstado.MATRICULADO) {
      throw new BadRequestException("Solo se pueden cancelar solicitudes aprobadas");
    }

    return this.prisma.$transaction(async (tx) => {
      if (solicitud.studentProfileId) {
        // Eliminar cargos generados por esta solicitud
        await tx.cargoInscripcion.deleteMany({
          where: { solicitudInscripcionId: solicitud.id },
        });

        // Buscar el studentProfile y su user
        const profile = await tx.studentProfile.findUnique({
          where: { id: solicitud.studentProfileId },
          include: { user: true },
        });

        if (profile) {
          // Remover enlaces de padres
          await tx.parentStudent.deleteMany({
            where: { studentProfileId: profile.id },
          });
          
          // Eliminar el perfil y el usuario
          await tx.studentProfile.delete({ where: { id: profile.id } });
          await tx.user.delete({ where: { id: profile.user.id } });

          // Eliminar de Supabase (opcional pero recomendado)
          await this.supabaseAdmin.auth.admin.deleteUser(profile.user.supabaseUid);
        }
      }

      return tx.solicitudInscripcion.update({
        where: { id: solicitud.id },
        data: { estado: SolicitudEstado.CANCELADA, cancelationReason: reason },
      });
    });
  }
}
