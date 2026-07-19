import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Response } from "express";
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

  private mapEjeToEnum(name: string): EjeArticulador | null {
    const n = name.toLowerCase();
    if (n.includes("inclusión")) return EjeArticulador.INCLUSION;
    if (n.includes("pensamiento crítico")) return EjeArticulador.PENSAMIENTO_CRITICO;
    if (n.includes("interculturalidad")) return EjeArticulador.INTERCULTURALIDAD_CRITICA;
    if (n.includes("igualdad")) return EjeArticulador.IGUALDAD_GENERO;
    if (n.includes("saludable")) return EjeArticulador.VIDA_SALUDABLE;
    if (n.includes("apropiación") || n.includes("lectura")) return EjeArticulador.APROPIACION_TECNOLOGIA;
    if (n.includes("arte") || n.includes("estética")) return EjeArticulador.ARTE_CULTURA;
    return null;
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

INSTRUCCIONES CRÍTICAS (DE CUMPLIMIENTO ESTRICTO):
1. INTEGRACIÓN CURRICULAR SIMULTÁNEA: NO aísles los campos formativos. La NEM exige un enfoque globalizador e interdisciplinario. En cada Momento de la metodología, DEBES cruzar y entrelazar actividades que aborden MÚLTIPLES Campos Formativos y PDAs al mismo tiempo, indicándolo en la columna 'campo_pda'.
2. SECUENCIACIÓN DIDÁCTICA (INICIO, DESARROLLO Y CIERRE): Las actividades NO deben ser descripciones abstractas o directas. Para CADA MOMENTO, desglosa la secuencia en tres fases claras usando viñetas ('- '):
   - Inicio: Dinámica lúdica para captar la atención o introducir el reto.
   - Desarrollo: La acción de exploración, juego o experimentación.
   - Cierre: Puesta en común, reflexión y las PREGUNTAS MEDIADORAS específicas (entre comillas) que la docente formulará para detonar el pensamiento crítico.
3. INTEGRACIÓN DE APOYOS (PMC Y AJUSTES): Integra el Programa de Mejora Continua (PMC) y los Ajustes Razonables EXPLÍCITAMENTE dentro de la narrativa de las actividades (ej. "Entregar el diploma...", "Usar pictogramas...").
4. EVALUACIÓN FORMATIVA (CONDUCTAS OBSERVABLES): No te limites a nombrar el instrumento. Debes redactar INDICADORES DE LOGRO ESPECÍFICOS y manifestaciones conductuales que la docente registrará (ej. "Rúbrica: Observar si el alumno dialoga asertivamente para resolver un conflicto en equipos o si requiere mediación").
5. El campo 'campo_pda' DEBE referenciar la fundamentación exacta provista, SIN PARAFRASEAR los contenidos ni PDAs de la SEP.
6. La columna 'organizacion' debe ser explícita (ej. "Grupo completo", "Pequeños equipos", "Individual").
7. Para 'recursos': Enumera de manera sumamente específica los materiales requeridos (ej. ingredientes, contenedores).

FORMATO JSON ESPERADO:
{
  "title": "Título creativo del proyecto",
  "matrizDidactica": [
    {
      "momento": "Nombre de la fase (ej: 1. Punto de partida)",
      "filas": [
        {
          "actividades": "- Actividad paso 1...\\n- Actividad paso 2 con preguntas reflexivas...\\n- Actividad paso 3 (incluyendo PMC o ajuste razonable si aplica)...",
          "campo_pda": "CAMPO: ...\\nCONTENIDO: ...\\nPDA: ...\\n\\nCAMPO: ... (si se abordan varios a la vez)",
          "organizacion": "Grupo completo",
          "recursos": "Material 1, Material 2...",
          "evaluacion": "Indicadores observables..."
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
        ejesArticuladores: (dto.ejesArticuladores || [])
          .map(e => this.mapEjeToEnum(e))
          .filter(Boolean) as EjeArticulador[],
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

  // ─── SSE Streaming ────────────────────────────────────────────────────────────

  async generatePlanningStream(
    dto: GeneratePlanningDto,
    currentUser: RequestUser,
    res: Response,
  ): Promise<void> {
    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // ── Validaciones (igual que generatePlanning) ──────────────────────────
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

      // ── Contexto curricular ────────────────────────────────────────────────
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

INSTRUCCIONES CRÍTICAS (DE CUMPLIMIENTO ESTRICTO):
1. INTEGRACIÓN CURRICULAR SIMULTÁNEA: NO aísles los campos formativos. La NEM exige un enfoque globalizador e interdisciplinario. En cada Momento de la metodología, DEBES cruzar y entrelazar actividades que aborden MÚLTIPLES Campos Formativos y PDAs al mismo tiempo, indicándolo en la columna 'campo_pda'.
2. SECUENCIACIÓN DIDÁCTICA (INICIO, DESARROLLO Y CIERRE): Las actividades NO deben ser descripciones abstractas o directas. Para CADA MOMENTO, desglosa la secuencia en tres fases claras usando viñetas ('- '):\n   - Inicio: Dinámica lúdica para captar la atención o introducir el reto.\n   - Desarrollo: La acción de exploración, juego o experimentación.\n   - Cierre: Puesta en común, reflexión y las PREGUNTAS MEDIADORAS específicas (entre comillas) que la docente formulará para detonar el pensamiento crítico.
3. INTEGRACIÓN DE APOYOS (PMC Y AJUSTES): Integra el Programa de Mejora Continua (PMC) y los Ajustes Razonables EXPLÍCITAMENTE dentro de la narrativa de las actividades (ej. "Entregar el diploma...", "Usar pictogramas...").
4. EVALUACIÓN FORMATIVA (CONDUCTAS OBSERVABLES): No te limites a nombrar el instrumento. Debes redactar INDICADORES DE LOGRO ESPECÍFICOS y manifestaciones conductuales que la docente registrará (ej. "Rúbrica: Observar si el alumno dialoga asertivamente para resolver un conflicto en equipos o si requiere mediación").
5. El campo 'campo_pda' DEBE referenciar la fundamentación exacta provista, SIN PARAFRASEAR los contenidos ni PDAs de la SEP.
6. La columna 'organizacion' debe ser explícita (ej. "Grupo completo", "Pequeños equipos", "Individual").
7. Para 'recursos': Enumera de manera sumamente específica los materiales requeridos (ej. ingredientes, contenedores).

FORMATO JSON ESPERADO:
{
  "title": "Título creativo del proyecto",
  "matrizDidactica": [
    {
      "momento": "Nombre de la fase (ej: 1. Punto de partida)",
      "filas": [
        {
          "actividades": "- Actividad paso 1...\\n- Actividad paso 2 con preguntas reflexivas...\\n- Actividad paso 3 (incluyendo PMC o ajuste razonable si aplica)...",
          "campo_pda": "CAMPO: ...\\nCONTENIDO: ...\\nPDA: ...\\n\\nCAMPO: ... (si se abordan varios a la vez)",
          "organizacion": "Grupo completo",
          "recursos": "Material 1, Material 2...",
          "evaluacion": "Indicadores observables..."
        }
      ]
    }
  ]
}`;

      // ── Notificar inicio del stream ────────────────────────────────────────
      sendEvent({ type: 'status', message: 'Iniciando generación con IA...' });

      // ── Stream de OpenAI ───────────────────────────────────────────────────
      let fullContent = "";

      const stream = openai.chat.completions.stream({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Genera la planeación ahora, devuelve únicamente el JSON." }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) {
          fullContent += token;
          sendEvent({ type: "token", content: token });
        }
      }

      // ── Parsear y guardar ──────────────────────────────────────────────────
      sendEvent({ type: 'status', message: 'Guardando planeación...' });

      let parsed: any;
      try {
        parsed = JSON.parse(fullContent);
      } catch {
        throw new InternalServerErrorException("Error al parsear el JSON de la IA.");
      }

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
          ejesArticuladores: (dto.ejesArticuladores || [])
            .map(e => this.mapEjeToEnum(e))
            .filter(Boolean) as EjeArticulador[],
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
          periodoProyecto: dto.periodoProyecto,
          problematica: dto.problematica,
          proposito: dto.proposito,
          instrumentoEvaluacion: dto.instrumentoEvaluacion || [],
          ajustesRazonables: dto.ajustesRazonables || [],
          actividadesPmc: dto.actividadesPmc || [],
          fundamentacion: contenidosRes,
          matrizDidactica: parsed.matrizDidactica,
        },
      });

      sendEvent({ type: 'done', planningId: planning.id });
      res.end();
    } catch (err: any) {
      const message =
        err?.response?.message ||
        err?.message ||
        "Error interno al generar la planeación.";
      sendEvent({ type: 'error', message });
      res.end();
    }
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
