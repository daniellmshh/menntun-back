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
      await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
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
        // Fallback: Si el admin también es un maestro (ej. maestro independiente)
        const selfTeacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { userId: currentUser.id },
        });
        if (selfTeacherProfile) {
          resolvedTeacherProfileId = selfTeacherProfile.id;
        } else {
          throw new BadRequestException("Debes especificar targetTeacherProfileId al generar como administrador");
        }
      } else {
        const targetTeacher = await this.prisma.teacherProfile.findUnique({
          where: { id: dto.targetTeacherProfileId },
          include: { user: true },
        });
        if (!targetTeacher) {
          throw new NotFoundException("El perfil de profesor especificado no existe.");
        }
        if (targetTeacher.user.schoolId !== (currentUser.activeSchoolId || currentUser.schoolId) as string) {
          throw new ForbiddenException("No puedes generar planeaciones para un profesor de otra escuela.");
        }
        resolvedTeacherProfileId = targetTeacher.id;
      }
    } else {
      throw new ForbiddenException("No tiene permisos para generar planeaciones.");
    }

    const isAcademicActive = await this.checkAcademicActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
    let isStandalone = true;
    let level: NivelEducativo;
    let order: number;

    if (dto.groupId) {
      if (!isAcademicActive) {
        throw new BadRequestException("El módulo académico no está activo para esta escuela. Debe usar el modo Standalone.");
      }
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, schoolId: (currentUser.activeSchoolId || currentUser.schoolId) as string },
        include: { grade: true },
      });
      if (!group) {
        throw new NotFoundException("El grupo especificado no existe o no pertenece a esta escuela.");
      }
      if (!group.grade?.level) {
        throw new BadRequestException("El grado asociado al grupo no tiene un nivel educativo configurado.");
      }
      isStandalone = false;
      level = group.grade?.level;
      order = group.grade?.order;
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

    // Build authoritative fundamentación — campo + contenido + PDA EXACTOS del JSON curricular
    // Este objeto es la fuente de verdad que se inyecta al prompt y que luego
    // se usa para sobrescribir el campo_pda en la respuesta de la IA.
    const fundamentacionStr = contenidosRes.map(
      (c, idx) => `[Selección ${idx + 1}]
Campo Formativo: "${c.nombreCampo}"
Contenido: "${c.contenido}"
PDA (Grado ${order}°, TEXTO OFICIAL SEP — NO PARAFRASEAR): "${c.pda}"`
    ).join("\n\n");

    // Pre-build el campo_pda autoritativo para inyectar en la respuesta de la IA
    const autoritativoCampoPda = contenidosRes.map(
      (c) => `CAMPO: ${c.nombreCampo}\nCONTENIDO: ${c.contenido}\nPDA: ${c.pda}`
    ).join("\n\n");

    // Calculate weekdays and total activities
    const sDate = new Date(dto.startDate + "T12:00:00Z");
    const eDate = new Date(dto.endDate + "T12:00:00Z");
    let totalWorkDays = 0;
    const workingDates: string[] = [];
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        totalWorkDays++;
        workingDates.push(`Día ${totalWorkDays} (${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})`);
      }
    }
    const totalActivities = totalWorkDays * dto.activitiesPerDay;
    const scheduleStr = workingDates.join(', ');

    const systemPrompt = `Eres un Diseñador Curricular de Élite especializado en educación preescolar (Fase 2) bajo el enfoque de la Nueva Escuela Mexicana (NEM).
Tu ÚNICA tarea es generar las ACTIVIDADES DIDÁCTICAS para una planeación. Los datos curriculares ya están definidos y son INAMOVIBLES.

Ficha de Identificación:
- Nivel: ${level}, Grado: ${order}°
- Periodo: Del ${dto.startDate} al ${dto.endDate}
- Actividades por día: ${dto.activitiesPerDay}
- Problemática: ${dto.problematica}
- Propósito: ${dto.proposito}
- Metodología: ${modalidadCtx.nombre} (${modalidadCtx.siglas})
- Ajustes Razonables: ${(dto.ajustesRazonables || []).join(', ')}
- Actividades PMC: ${(dto.actividadesPmc || []).join(', ')}
- Instrumento de Evaluación: ${(dto.instrumentoEvaluacion || []).join(', ')}
- Ejes Articuladores: ${(dto.ejesArticuladores || []).join(', ')}

Fases de la Metodología Oficial:
${modalidadCtx.fases.map((f, i) => `${i + 1}. ${f}`).join('\n')}

═══════════════════════════════════════════════════════════
FUNDAMENTACIÓN CURRICULAR — FUENTE DE VERDAD OFICIAL SEP:
(Extraída literalmente del Programa Sintético NEM. Prohibido parafrasear, modificar o inventar.)
═══════════════════════════════════════════════════════════
${fundamentacionStr}
═══════════════════════════════════════════════════════════

INSTRUCCIONES CRÍTICAS (DE CUMPLIMIENTO ESTRICTO):
1. INTEGRACIÓN CURRICULAR: Diseña actividades que se apoyen en los Campos y PDAs listados arriba, pero asignando de forma específica a CADA ACTIVIDAD ÚNICAMENTE los Campos y PDAs que realmente se estén abordando en ella (no tienes que abordarlos todos simultáneamente en cada actividad, sino distribuirlos de forma lógica a lo largo del proyecto).
2. SECUENCIACIÓN DIDÁCTICA (INICIO, DESARROLLO Y CIERRE): Para CADA ACTIVIDAD desglosa obligatoriamente en tres momentos con viñetas ('-'):
   - Inicio: Dinámica lúdica o provocación para captar la atención.
   - Desarrollo: Exploración activa, juego, experimentación con materiales concretos.
   - Cierre: Puesta en común y PREGUNTAS MEDIADORAS específicas (literalmente entre comillas) que la docente hará para detonar el pensamiento crítico.
3. DENSIDAD DE ACTIVIDADES (CRÍTICO): El proyecto abarca ${totalWorkDays} días hábiles (del ${dto.startDate} al ${dto.endDate}). Los días son: ${scheduleStr}. Tienes que generar EXACTAMENTE un TOTAL de ${totalActivities} actividades en toda la planeación (${dto.activitiesPerDay} por cada día hábil). Es REQUISITO INDISPENSABLE que la suma total sea exactamente ${totalActivities}. En la redacción de cada actividad, DEBES INCLUIR COMO TÍTULO EL DÍA Y LA FECHA EXACTA, por ejemplo: "**Día 1 (23/07/2026) - Actividad 1**".
4. INTEGRACIÓN DE APOYOS: Inyecta PMC y Ajustes Razonables de forma explícita en la narrativa de las actividades.
5. EVALUACIÓN FORMATIVA: Redacta INDICADORES DE LOGRO Y MANIFESTACIONES CONDUCTUALES observables (ej. "Rúbrica: Observar si el alumno dialoga asertivamente...").
6. RECURSOS: Lista materiales físicos específicos (ingredientes, contenedores, cantidades si aplica).
7. CAMPO_PDA — REGLA ABSOLUTA: En el campo 'campo_pda' de cada actividad escribe ÚNICAMENTE la etiqueta de referencia (ej. "[Selección 1]") que corresponda específicamente a esa actividad. El sistema backend reemplazará esta etiqueta con el texto oficial. NUNCA escribas el texto del contenido ni del PDA tú mismo. NUNCA combines múltiples selecciones en una misma actividad.
8. AJUSTES Y PMC: Si el texto libre proporcionado en 'Ajustes Razonables' o 'Actividades PMC' carece de sentido pedagógico, está vacío o es incongruente, ignóralo y propón tú mismo la opción más adecuada para el contexto de la actividad.

FORMATO JSON ESPERADO:
{
  "title": "Título creativo del proyecto",
  "matrizDidactica": [
    {
      "momento": "1. Nombre de la fase",
      "filas": [
        {
          "actividades": "**Día 1 (23/07/2026) - Actividad 1**\\n- [Inicio] Dinámica...\\n- [Desarrollo] Acción...\\n- [Cierre] Reflexión: '¿...'\\n\\n**Día 1 (23/07/2026) - Actividad 2**\\n- [Inicio]...\\n- [Desarrollo]...\\n- [Cierre]...",
          "campo_pda": "[Selección 1]",
          "organizacion": "Grupo completo",
          "recursos": "Material 1, Material 2...",
          "evaluacion": "Rúbrica: Observar si el alumno..."
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

    // ─── POST-PROCESAMIENTO: Sobrescribir campo_pda con datos OFICIALES de la SEP ───
    // Reemplazamos las etiquetas "[Selección N]" con el texto oficial del currículo NEM
    const autoritativoMap: Record<string, string> = {};
    contenidosRes.forEach((c, idx) => {
      autoritativoMap[`[Selección ${idx + 1}]`] = `CAMPO: ${c.nombreCampo}\nCONTENIDO: ${c.contenido}\nPDA: ${c.pda}`;
    });

    if (parsed.matrizDidactica && Array.isArray(parsed.matrizDidactica)) {
      for (const momento of parsed.matrizDidactica) {
        if (Array.isArray(momento.filas)) {
          for (const fila of momento.filas) {
            const matches = (fila.campo_pda || "").match(/\[Selección \d+\]/g);
            if (matches && matches.length > 0) {
              fila.campo_pda = matches.map((tag: string) => autoritativoMap[tag] || "").filter(Boolean).join('\n\n');
            } else {
              fila.campo_pda = autoritativoCampoPda; // fallback
            }
          }
        }
      }
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
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        activitiesPerDay: dto.activitiesPerDay,
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
        await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
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
          // Fallback: Si el admin también es un maestro (ej. maestro independiente)
          const selfTeacherProfile = await this.prisma.teacherProfile.findUnique({
            where: { userId: currentUser.id },
          });
          if (selfTeacherProfile) {
            resolvedTeacherProfileId = selfTeacherProfile.id;
          } else {
            throw new BadRequestException("Debes especificar targetTeacherProfileId al generar como administrador");
          }
        } else {
          const targetTeacher = await this.prisma.teacherProfile.findUnique({
            where: { id: dto.targetTeacherProfileId },
            include: { user: true },
          });
          if (!targetTeacher) {
            throw new NotFoundException("El perfil de profesor especificado no existe.");
          }
          if (targetTeacher.user.schoolId !== (currentUser.activeSchoolId || currentUser.schoolId) as string) {
            throw new ForbiddenException("No puedes generar planeaciones para un profesor de otra escuela.");
          }
          resolvedTeacherProfileId = targetTeacher.id;
        }
      } else {
        throw new ForbiddenException("No tiene permisos para generar planeaciones.");
      }

      const isAcademicActive = await this.checkAcademicActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
      let isStandalone = true;
      let level: NivelEducativo;
      let order: number;

      if (dto.groupId) {
        if (!isAcademicActive) {
          throw new BadRequestException("El módulo académico no está activo para esta escuela. Debe usar el modo Standalone.");
        }
        const group = await this.prisma.group.findFirst({
          where: { id: dto.groupId, schoolId: (currentUser.activeSchoolId || currentUser.schoolId) as string },
          include: { grade: true },
        });
        if (!group) {
          throw new NotFoundException("El grupo especificado no existe o no pertenece a esta escuela.");
        }
        if (!group.grade?.level) {
          throw new BadRequestException("El grado asociado al grupo no tiene un nivel educativo configurado.");
        }
        isStandalone = false;
        level = group.grade?.level;
        order = group.grade?.order;
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
        (c, idx) => `[Selección ${idx + 1}]
Campo Formativo: "${c.nombreCampo}"
Contenido: "${c.contenido}"
PDA (Grado ${order}°, TEXTO OFICIAL SEP — NO PARAFRASEAR): "${c.pda}"`
      ).join("\n\n");

      const autoritativoCampoPda = contenidosRes.map(
        (c) => `CAMPO: ${c.nombreCampo}\nCONTENIDO: ${c.contenido}\nPDA: ${c.pda}`
      ).join("\n\n");

      // Calculate weekdays and total activities
      const sDate = new Date(dto.startDate + "T12:00:00Z");
      const eDate = new Date(dto.endDate + "T12:00:00Z");
      let totalWorkDays = 0;
      const workingDates: string[] = [];
      for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          totalWorkDays++;
          workingDates.push(`Día ${totalWorkDays} (${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})`);
        }
      }
      const totalActivities = totalWorkDays * dto.activitiesPerDay;
      const scheduleStr = workingDates.join(', ');

      const systemPrompt = `Eres un Diseñador Curricular de Élite especializado en educación preescolar (Fase 2) bajo el enfoque de la Nueva Escuela Mexicana (NEM).
Tu Única tarea es generar las ACTIVIDADES DIDÁCTICAS para una planeación. Los datos curriculares ya están definidos y son INAMOVIBLES.

Ficha de Identificación:
- Nivel: ${level}, Grado: ${order}°
- Periodo: Del ${dto.startDate} al ${dto.endDate}
- Actividades por día: ${dto.activitiesPerDay}
- Problemática: ${dto.problematica}
- Propósito: ${dto.proposito}
- Metodología: ${modalidadCtx.nombre} (${modalidadCtx.siglas})
- Ajustes Razonables: ${(dto.ajustesRazonables || []).join(', ')}
- Actividades PMC: ${(dto.actividadesPmc || []).join(', ')}
- Instrumento de Evaluación: ${(dto.instrumentoEvaluacion || []).join(', ')}
- Ejes Articuladores: ${(dto.ejesArticuladores || []).join(', ')}

Fases de la Metodología Oficial:
${modalidadCtx.fases.map((f, i) => `${i + 1}. ${f}`).join('\n')}

═══════════════════════════════════════════════════════
FUNDAMENTACIÓN CURRICULAR — FUENTE DE VERDAD OFICIAL SEP:
(Extraída literalmente del Programa Sintético NEM. Prohibido parafrasear, modificar o inventar.)
═══════════════════════════════════════════════════════
${fundamentacionStr}
═══════════════════════════════════════════════════════

INSTRUCCIONES CRÍTICAS (DE CUMPLIMIENTO ESTRICTO):
1. INTEGRACIÓN CURRICULAR: Diseña actividades que se apoyen en los Campos y PDAs listados arriba, pero asignando de forma específica a CADA ACTIVIDAD ÚNICAMENTE los Campos y PDAs que realmente se estén abordando en ella (no tienes que abordarlos todos simultáneamente en cada actividad, sino distribuirlos de forma lógica a lo largo del proyecto).
2. SECUENCIACIÓN DIDÁCTICA (INICIO, DESARROLLO Y CIERRE): Para CADA ACTIVIDAD desglosa obligatoriamente en tres momentos con viñetas ('-'):
   - Inicio: Dinámica lúdica o provocación para captar la atención.
   - Desarrollo: Exploración activa, juego, experimentación con materiales concretos.
   - Cierre: Puesta en común y PREGUNTAS MEDIADORAS específicas (literalmente entre comillas) que la docente hará para detonar el pensamiento crítico.
3. DENSIDAD DE ACTIVIDADES (CRÍTICO): El proyecto abarca ${totalWorkDays} días hábiles (del ${dto.startDate} al ${dto.endDate}). Los días son: ${scheduleStr}. Tienes que generar EXACTAMENTE un TOTAL de ${totalActivities} actividades en toda la planeación (${dto.activitiesPerDay} por cada día hábil). Es REQUISITO INDISPENSABLE que la suma total sea exactamente ${totalActivities}. En la redacción de cada actividad, DEBES INCLUIR COMO TÍTULO EL DÍA Y LA FECHA EXACTA, por ejemplo: "**Día 1 (23/07/2026) - Actividad 1**".
4. INTEGRACIÓN DE APOYOS: Inyecta PMC y Ajustes Razonables de forma explícita en la narrativa de las actividades.
5. EVALUACIÓN FORMATIVA: Redacta INDICADORES DE LOGRO Y MANIFESTACIONES CONDUCTUALES observables (ej. "Rúbrica: Observar si el alumno dialoga asertivamente...").
6. RECURSOS: Lista materiales físicos específicos (ingredientes, contenedores, cantidades si aplica).
7. CAMPO_PDA — REGLA ABSOLUTA: En el campo 'campo_pda' de cada actividad escribe ÚNICAMENTE la etiqueta de referencia (ej. "[Selección 1]") que corresponda específicamente a esa actividad. El sistema backend reemplazará esta etiqueta con el texto oficial. NUNCA escribas el texto del contenido ni del PDA tú mismo. NUNCA combines múltiples selecciones en una misma actividad.
8. AJUSTES Y PMC: Si el texto libre proporcionado en 'Ajustes Razonables' o 'Actividades PMC' carece de sentido pedagógico, está vacío o es incongruente, ignóralo y propón tú mismo la opción más adecuada para el contexto de la actividad.

FORMATO JSON ESPERADO:
{
  "title": "Título creativo del proyecto",
  "matrizDidactica": [
    {
      "momento": "1. Nombre de la fase",
      "filas": [
        {
          "actividades": "**Día 1 (23/07/2026) - Actividad 1**\\n- [Inicio] Dinámica...\\n- [Desarrollo] Acción...\\n- [Cierre] Reflexión: '¿...'\\n\\n**Día 1 (23/07/2026) - Actividad 2**\\n- [Inicio]...\\n- [Desarrollo]...\\n- [Cierre]...",
          "campo_pda": "[Selección 1]",
          "organizacion": "Grupo completo",
          "recursos": "Material 1, Material 2...",
          "evaluacion": "Rúbrica: Observar si el alumno..."
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

      // ─── POST-PROCESAMIENTO: Sobrescribir campo_pda con datos OFICIALES de la SEP ───
      const autoritativoMap: Record<string, string> = {};
      contenidosRes.forEach((c, idx) => {
        autoritativoMap[`[Selección ${idx + 1}]`] = `CAMPO: ${c.nombreCampo}\nCONTENIDO: ${c.contenido}\nPDA: ${c.pda}`;
      });

      if (parsed.matrizDidactica && Array.isArray(parsed.matrizDidactica)) {
        for (const momento of parsed.matrizDidactica) {
          if (Array.isArray(momento.filas)) {
            for (const fila of momento.filas) {
              const matches = (fila.campo_pda || "").match(/\[Selección \d+\]/g);
              if (matches && matches.length > 0) {
                fila.campo_pda = matches.map((tag: string) => autoritativoMap[tag] || "").filter(Boolean).join('\n\n');
              } else {
                fila.campo_pda = autoritativoCampoPda; // fallback
              }
            }
          }
        }
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
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          activitiesPerDay: dto.activitiesPerDay,
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
      await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
    }
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.planning.findMany({ orderBy: { createdAt: "desc" } });
    }
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      return this.prisma.planning.findMany({
        where: { teacherProfile: { user: { schoolId: (currentUser.activeSchoolId || currentUser.schoolId) as string } } },
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
      await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role === UserRole.SUPER_ADMIN) return planning;
    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (planning.teacherProfile.user.schoolId !== (currentUser.activeSchoolId || currentUser.schoolId) as string) {
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
      await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== (currentUser.activeSchoolId || currentUser.schoolId) as string) throw new ForbiddenException("Sin permisos.");
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
      await this.verifyPlanningActive((currentUser.activeSchoolId || currentUser.schoolId) as string);
    }
    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: { teacherProfile: { include: { user: true } } },
    });
    if (!planning) throw new NotFoundException("Planeación no encontrada.");

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== (currentUser.activeSchoolId || currentUser.schoolId) as string) throw new ForbiddenException("Sin permisos.");
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
