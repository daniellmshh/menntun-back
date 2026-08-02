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
      const group = await tx.group.findFirst({
        where: {
          id: dto.groupId,
          schoolId,
          gradeId: dto.gradeId,
        },
      });

      if (!group) {
        throw new BadRequestException(
          "El grupo seleccionado no corresponde al grado o a la escuela activa",
        );
      }

      if (dto.schoolYearId && dto.schoolYearId !== group.schoolYearId) {
        throw new BadRequestException(
          "El grupo seleccionado no pertenece al ciclo escolar indicado",
        );
      }

      const solicitud = await tx.solicitudInscripcion.create({
        data: {
          schoolId,
          schoolYearId: dto.schoolYearId ?? group.schoolYearId,
          studentProfileId: dto.studentProfileId,
          primerNombre: dto.primerNombre,
          segundoNombre: dto.segundoNombre,
          primerApellido: dto.primerApellido,
          segundoApellido: dto.segundoApellido,
          firstName: dto.firstName || dto.primerNombre,
          lastName: dto.lastName || dto.primerApellido,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender,
          bloodType: dto.bloodType,
          address: dto.address,
          nivelEducativo: dto.nivelEducativo,
          gradeId: dto.gradeId,
          groupId: group.id,
          estado: SolicitudEstado.DRAFT,
        },
      });

      const tiposDocumento = await tx.tipoDocumentoEscuela.findMany({
        where: { schoolId, activo: true },
        select: { id: true, slug: true, nombre: true, obligatorio: true },
      });

      if (tiposDocumento.length > 0) {
        await tx.documentoSolicitud.createMany({
          data: tiposDocumento.map((tipoDocumento) => ({
            solicitudInscripcionId: solicitud.id,
            tipoDocumentoId: tipoDocumento.id,
            tipoDocumento: tipoDocumento.slug,
            nombreDocumento: tipoDocumento.nombre,
            obligatorio: tipoDocumento.obligatorio,
            estado: DocumentoEstado.PENDIENTE,
          })),
        });
      }

      if (dto.padres && dto.padres.length > 0) {
        await tx.datosPadreSolicitud.createMany({
          data: dto.padres.map((p) => ({
            solicitudInscripcionId: solicitud.id,
            primerNombre: p.primerNombre,
            segundoNombre: p.segundoNombre,
            primerApellido: p.primerApellido,
            segundoApellido: p.segundoApellido,
            firstName: p.firstName || p.primerNombre,
            lastName: p.lastName || p.primerApellido,
            email: p.email,
            phone: p.phone,
            relationship: p.relationship,
            isPrimary: p.isPrimary ?? false,
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

  async updateDocumento(docId: string, schoolId: string, dto: ChangeDocumentoStatusDto) {
    const documento = await this.prisma.documentoSolicitud.findFirst({
      where: { id: docId, solicitud: { schoolId } },
      select: { id: true },
    });

    if (!documento) {
      throw new NotFoundException("Documento no encontrado");
    }

    return this.prisma.documentoSolicitud.update({
      where: { id: documento.id },
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

    // Los documentos obligatorios pendientes conservan la matrícula como condicional.

    if (!solicitud.groupId || !solicitud.gradeId) {
      throw new BadRequestException(
        "La solicitud no tiene un grado y grupo asignados; asígnalos antes de aprobarla",
      );
    }

    const group = await this.prisma.group.findFirst({
      where: {
        id: solicitud.groupId,
        schoolId,
        gradeId: solicitud.gradeId,
        ...(solicitud.schoolYearId
          ? { schoolYearId: solicitud.schoolYearId }
          : {}),
      },
      select: {
        id: true,
        maxStudents: true,
      },
    });

    if (!group) {
      throw new BadRequestException(
        "El grupo asignado ya no corresponde a esta escuela, grado o ciclo escolar",
      );
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
            data: { schoolId, role: UserRole.PARENT, 
            primerApellido: p.primerApellido,
            firstName: p.firstName || p.primerNombre, lastName: p.lastName },
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
              firstName: p.firstName || p.primerNombre,
              lastName: p.lastName || p.primerApellido,
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
        await tx.cargo.createMany({
          data: dto.cargos.map((c) => ({
            studentProfileId: finalStudentProfileId!,
            schoolId,
            schoolYearId: solicitud.schoolYearId,
            solicitudInscripcionId: solicitud.id,
            concepto: c.concepto,
            monto: c.monto,
            fechaVencimiento: new Date(c.fechaVencimiento),
          })),
        });
      }

      // 4. Inscribir alumno en el grupo si fue seleccionado
      if (solicitud.groupId && finalStudentProfileId) {
        // Verificar si ya está inscrito
        const existingEnrollment = await tx.enrollment.findFirst({
          where: { studentProfileId: finalStudentProfileId, groupId: solicitud.groupId }
        });
        
        if (!existingEnrollment) {
          if (group.maxStudents !== null) {
            const enrollmentCount = await tx.enrollment.count({
              where: { groupId: group.id, status: "ACTIVE" },
            });

            if (enrollmentCount >= group.maxStudents) {
              throw new BadRequestException(
                "El grupo asignado ya alcanzó su cupo máximo",
              );
            }
          }

          await tx.enrollment.create({
            data: {
              studentProfileId: finalStudentProfileId,
              groupId: solicitud.groupId,
            }
          });
        }
      }

      // 5. Cambiar estado a APROBADA
      return tx.solicitudInscripcion.update({
        where: { id: solicitud.id },
        data: { estado: SolicitudEstado.APROBADA },
      });
    });
  }

  async reject(id: string, schoolId: string, reason: string) {
    return this.prisma.solicitudInscripcion.updateMany({
      where: { id, schoolId },
      data: { estado: SolicitudEstado.RECHAZADA, motivoRechazo: reason },
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
        await tx.cargo.deleteMany({
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
        data: { estado: SolicitudEstado.CANCELADA, motivoRechazo: reason },
      });
    });
  }

  
  async getCapacity(schoolId: string, schoolYearId?: string) {
    return { capacity: 100 }; // mock implementation, will implement properly later
  }

  async getTiposDocumento(schoolId: string) {
    return this.prisma.tipoDocumentoEscuela.findMany({
      where: { schoolId, activo: true },
      orderBy: { orden: "asc" },
    });
  }

  async createTipoDocumento(schoolId: string, dto: any) {
    return this.prisma.tipoDocumentoEscuela.create({ data: { ...dto, schoolId } });
  }

  async updateTipoDocumento(id: string, schoolId: string, dto: any) {
    return this.prisma.tipoDocumentoEscuela.update({ where: { id, schoolId }, data: dto });
  }

  async deleteTipoDocumento(id: string, schoolId: string) {
    return this.prisma.tipoDocumentoEscuela.update({ where: { id, schoolId }, data: { activo: false } });
  }

// ─── DOCUMENTOS ────────────────────────────────────────

  async getDocuments(solicitudId: string, schoolId: string) {
    const solicitud = await this.prisma.solicitudInscripcion.findFirst({
      where: { id: solicitudId, schoolId },
      include: {
        documentos: {
          include: { tipoDocRef: true },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    return solicitud.documentos;
  }

  async uploadDocument(solicitudId: string, schoolId: string, tipoDocumentoId: string, file: any) {
    if (!file) {
      throw new BadRequestException("Archivo no proporcionado");
    }

    const solicitud = await this.prisma.solicitudInscripcion.findFirst({
      where: { id: solicitudId, schoolId },
    });

    if (!solicitud) {
      throw new NotFoundException("Solicitud no encontrada");
    }

    const tipoDoc = await this.prisma.tipoDocumentoEscuela.findFirst({
      where: { id: tipoDocumentoId, schoolId, activo: true },
    });

    if (!tipoDoc) {
      throw new NotFoundException("Tipo de documento no encontrado en esta escuela");
    }

    // Subir a Supabase Storage (bucket: enrollment-docs)
    const fileExtension = file.originalname.split(".").pop();
    const filePath = `${schoolId}/${solicitudId}/${tipoDocumentoId}_${Date.now()}.${fileExtension}`;

    const { data: uploadData, error } = await this.supabaseAdmin.storage
      .from("enrollment-docs")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Error subiendo documento a Supabase: ${error.message}`);
    }

    const fileUrl = `${this.configService.get("supabase.url")}/storage/v1/object/public/enrollment-docs/${filePath}`;

    // Cada archivo debe corresponder a un requisito del expediente de la solicitud.
    const existingDoc = await this.prisma.documentoSolicitud.findFirst({
      where: {
        solicitudInscripcionId: solicitudId,
        tipoDocumentoId,
      },
    });

    if (!existingDoc) {
      throw new BadRequestException(
        "El tipo de documento no forma parte del expediente de esta solicitud",
      );
    }

    const documento = await this.prisma.documentoSolicitud.update({
      where: { id: existingDoc.id },
      data: { fileUrl, estado: DocumentoEstado.RECIBIDO, observaciones: null },
    });

    return documento;
  }
}
