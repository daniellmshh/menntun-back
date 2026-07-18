import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  PrismaClient,
  UserRole,
  NivelEducativo,
  PlanningModalidad,
  CampoFormativo,
  EjeArticulador,
  PlanningStatus,
  Planning,
} from "@prisma/client";
import { GeneratePlanningDto, UpdatePlanningDto } from "./planning.dto";
import { RequestUser } from "../../common/types";
import { NemKnowledgeService } from "./nem-knowledge.service";
import { openai } from "../../lib/openai";

@Injectable()
export class PlanningGenerationService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly nemKnowledgeService: NemKnowledgeService,
  ) {}

  private async verifyPlanningActive(schoolId: string) {
    const activeModule = await this.prisma.schoolModule.findUnique({
      where: {
        schoolId_module: {
          schoolId,
          module: "planning",
        },
      },
    });
    if (!activeModule || !activeModule.active) {
      throw new ForbiddenException("El módulo de planeaciones no está activo para esta escuela.");
    }
  }

  private async checkAcademicActive(schoolId: string): Promise<boolean> {
    const activeModule = await this.prisma.schoolModule.findUnique({
      where: {
        schoolId_module: {
          schoolId,
          module: "academic",
        },
      },
    });
    return activeModule?.active ?? false;
  }

  async generatePlanning(
    dto: GeneratePlanningDto,
    currentUser: RequestUser,
  ): Promise<{ planning: Planning }> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }

    let resolvedTeacherProfileId: string;
    if (currentUser.role === UserRole.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.id },
      });
      if (!teacherProfile) {
        throw new ForbiddenException("El usuario actual no tiene un perfil de profesor configurado.");
      }
      resolvedTeacherProfileId = teacherProfile.id;
    } else if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SCHOOL_ADMIN
    ) {
      if (!dto.targetTeacherProfileId) {
        throw new BadRequestException("Debes especificar targetTeacherProfileId al generar como administrador");
      }
      const targetTeacher = await this.prisma.teacherProfile.findUnique({
        where: { id: dto.targetTeacherProfileId },
        include: { user: true },
      });
      if (!targetTeacher) {
        throw new NotFoundException("El perfil de profesor especificado no existe.");
      }
      if (targetTeacher.user.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException("No puedes generar planeaciones para un profesor de otra escuela.");
      }
      resolvedTeacherProfileId = targetTeacher.id;
    } else {
      throw new ForbiddenException("No tiene permisos para generar planeaciones.");
    }

    const isAcademicActive = await this.checkAcademicActive(currentUser.schoolId);
    let isStandalone = true;
    let level: NivelEducativo;
    let order: number;

    if (dto.groupId) {
      if (!isAcademicActive) {
        throw new BadRequestException("El módulo académico no está activo para esta escuela. Debe usar el modo Standalone.");
      }
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, schoolId: currentUser.schoolId },
        include: { grade: true },
      });
      if (!group) {
        throw new NotFoundException("El grupo especificado no existe o no pertenece a esta escuela.");
      }
      if (!group.grade.level) {
        throw new BadRequestException("El grado asociado al grupo no tiene un nivel educativo configurado.");
      }
      isStandalone = false;
      level = group.grade.level;
      order = group.grade.order;
    } else {
      if (!dto.standaloneLevel || !dto.standaloneGradeOrder) {
        throw new BadRequestException("Para el modo Standalone, debe proporcionar standaloneLevel y standaloneGradeOrder.");
      }
      isStandalone = true;
      level = dto.standaloneLevel;
      order = dto.standaloneGradeOrder;
    }

    // Curricular info
    const contenidosRes = this.nemKnowledgeService.getContenidosPorSeleccion(
      level,
      order,
      dto.camposSeleccionados || []
    );

    const modalidadCtx = this.nemKnowledgeService.getModalidad(dto.modalidad);
    if (!modalidadCtx) {
      throw new InternalServerErrorException(`Modalidad ${dto.modalidad} no encontrada.`);
    }

    const fundamentacionStr = contenidosRes.map(
      (c) => `CAMPO: ${c.campoFormativo}\nCONTENIDO: ${c.contenido}\nPDA: ${c.pda}`
    ).join("\n\n");

    const systemPrompt = `Eres un asistente pedagógico experto en la Nueva Escuela Mexicana (NEM).
Tu tarea es generar una planeación didáctica en formato JSON.

Ficha de Identificación:
- Nivel: ${level}, Grado: ${order}°
- Periodo: ${dto.periodoProyecto || 'Por definir'}
- Problemática: ${dto.problematica}
- Propósito: ${dto.proposito}
- Metodología: ${modalidadCtx.nombre} (${modalidadCtx.siglas})
- Ajustes Razonables: ${(dto.ajustesRazonables || []).join(', ')}
- Actividades PMC: ${(dto.actividadesPmc || []).join(', ')}
- Instrumento de Evaluación: ${(dto.instrumentoEvaluacion || []).join(', ')}
- Ejes Articuladores: ${(dto.ejesArticuladores || []).join(', ')}

Fases de la Metodología Oficial:
${modalidadCtx.fases.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Fundamentación Curricular Seleccionada (COPIAR EXACTAMENTE):
${fundamentacionStr}

INSTRUCCIONES CRÍTICAS:
- Genera actividades lúdicas, reflexivas y contextualizadas a la problemática y propósito.
- Genera EXACTAMENTE una fila o conjunto de filas para CADA momento de la metodología elegida.
- El campo 'campo_pda' debe referenciar la fundamentación exacta provista, sin parafrasear.
- Para 'evaluacion': indica indicadores OBSERVABLES.
- Para 'organizacion': "Grupo completo", "Pequeños equipos", "Parejas", o "Individual".

FORMATO JSON ESPERADO:
{
  "title": "Título creativo del proyecto",
  "matrizDidactica": [
    {
      "momento": "Nombre de la fase (ej: 1. Punto de partida)",
      "filas": [
        {
          "actividades": "Descripción detallada de actividades",
          "campo_pda": "CAMPO: ...\\nCONTENIDO: ...\\nPDA: ...",
          "organizacion": "Grupo completo",
          "recursos": "Materiales",
          "evaluacion": "Observaciones..."
        }
      ]
    }
  ]
}`;

    const generationCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Genera la planeación ahora, devuelve únicamente el JSON." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const jsonText = generationCompletion.choices[0].message?.content;
    if (!jsonText) {
      throw new InternalServerErrorException("No se recibió respuesta.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new InternalServerErrorException("Error al parsear el JSON de la IA.");
    }

    // Construct Legacy Fields
    const contenidosLegacy = contenidosRes.map(c => c.contenido).join(" | ");
    const pdaLegacy = contenidosRes.map(c => c.pda).join(" | ");
    const mainCampoEnum = dto.camposSeleccionados && dto.camposSeleccionados.length > 0
      ? (dto.camposSeleccionados[0].campoFormativoId as CampoFormativo)
      : CampoFormativo.LENGUAJES;

    const legacyFases = (parsed.matrizDidactica || []).map((m: any, idx: number) => ({
      nombre: m.momento,
      actividades: (m.filas || []).map((f: any) => f.actividades).join("\\n\\n"),
      orden: idx + 1
    }));
    
    let produccionSug = "";
    if (parsed.matrizDidactica && parsed.matrizDidactica.length > 0) {
      const lastFase = parsed.matrizDidactica[parsed.matrizDidactica.length - 1];
      produccionSug = (lastFase.filas || []).map((f: any) => f.actividades).join(" ");
    }

    const contentMarkdown = `
# ${parsed.title || "Planeación"}
**Problemática:** ${dto.problematica}
**Propósito:** ${dto.proposito}
`;

    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const planning = await this.prisma.planning.create({
      data: {
        teacherProfileId: resolvedTeacherProfileId,
        groupId: dto.groupId || null,
        subjectId: dto.subjectId || null,
        isStandalone,
        standaloneLevel: isStandalone ? level : null,
        standaloneGradeOrder: isStandalone ? order : null,
        modalidad: dto.modalidad,
        campoFormativo: mainCampoEnum,
        ejesArticuladores: (dto.ejesArticuladores || []) as EjeArticulador[],
        contextoInicial: dto.contextoInicial || "",
        contenidos: contenidosLegacy,
        pda: pdaLegacy,
        relevanciaSocial: dto.proposito || "",
        produccionSugerida: produccionSug.substring(0, 500),
        fases: legacyFases,
        title: parsed.title || "Planeación SARA",
        content: contentMarkdown,
        weekStart,
        status: PlanningStatus.DRAFT,
        // New SARA Fields
        periodoProyecto: dto.periodoProyecto,
        problematica: dto.problematica,
        proposito: dto.proposito,
        instrumentoEvaluacion: dto.instrumentoEvaluacion || [],
        ajustesRazonables: dto.ajustesRazonables || [],
        actividadesPmc: dto.actividadesPmc || [],
        fundamentacion: contenidosRes,
        matrizDidactica: parsed.matrizDidactica
      },
    });

    return { planning };
  }

  async findAll(currentUser: RequestUser): Promise<Planning[]> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.planning.findMany({ orderBy: { createdAt: "desc" } });
    }
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      return this.prisma.planning.findMany({
        where: { teacherProfile: { user: { schoolId: currentUser.schoolId } } },
        orderBy: { createdAt: "desc" },
      });
    }
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: currentUser.id },
    });
    if (!teacherProfile) return [];
    return this.prisma.planning.findMany({
      where: { teacherProfileId: teacherProfile.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, currentUser: RequestUser): Promise<Planning> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role === UserRole.SUPER_ADMIN) return planning;
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException("No tiene permisos.");
      }
      return planning;
    }
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: currentUser.id },
    });
    if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) {
      throw new ForbiddenException("No es dueño de esta planeación.");
    }
    return planning;
  }

  async update(id: string, dto: UpdatePlanningDto, currentUser: RequestUser): Promise<Planning> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) throw new ForbiddenException("Sin permisos.");
      } else {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({ where: { userId: currentUser.id } });
        if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) throw new ForbiddenException("No dueño.");
      }
    }
    return this.prisma.planning.update({
      where: { id },
      data: {
        title: dto.title,
        periodoProyecto: dto.periodoProyecto,
        problematica: dto.problematica,
        proposito: dto.proposito,
        instrumentoEvaluacion: dto.instrumentoEvaluacion,
        ajustesRazonables: dto.ajustesRazonables,
        actividadesPmc: dto.actividadesPmc,
        fundamentacion: dto.fundamentacion,
        matrizDidactica: dto.matrizDidactica,
        ejesArticuladores: dto.ejesArticuladores as any,
        status: dto.status,
      },
    });
  }

  async delete(id: string, currentUser: RequestUser): Promise<{ success: boolean }> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) throw new ForbiddenException("Sin permisos.");
      } else {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({ where: { userId: currentUser.id } });
        if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) throw new ForbiddenException("No dueño.");
      }
    }
    await this.prisma.planning.delete({ where: { id } });
    return { success: true };
  }

  async getTeachersList(schoolId: string) {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: { user: { schoolId, active: true } },
      include: { user: true },
    });
    return teachers.map((t) => ({
      id: t.id,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      email: t.user.email,
    }));
  }

  getCatalogo(currentUser: RequestUser) {
    return this.nemKnowledgeService.getCatalogo(NivelEducativo.PREESCOLAR);
  }
}
