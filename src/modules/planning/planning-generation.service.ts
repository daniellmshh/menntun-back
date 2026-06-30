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
import { getSepPdfSourceFile } from "./sep-pdf-mapping";
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
  ): Promise<{ planning: Planning; sugerenciaIA: any }> {
    // 1. Verify feature flag
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }

    // 2. Resolve teacher profile
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
        throw new BadRequestException(
          "Debes especificar targetTeacherProfileId al generar como administrador",
        );
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

    // 3. Determine standalone vs integrated mode
    const isAcademicActive = await this.checkAcademicActive(currentUser.schoolId);
    let isStandalone = true;
    let level: NivelEducativo;
    let order: number;

    if (dto.groupId) {
      if (!isAcademicActive) {
        throw new BadRequestException(
          "El módulo académico no está activo para esta escuela. Debe usar el modo Standalone.",
        );
      }

      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, schoolId: currentUser.schoolId },
        include: { grade: true },
      });

      if (!group) {
        throw new NotFoundException("El grupo especificado no existe o no pertenece a esta escuela.");
      }

      if (!group.grade.level) {
        throw new BadRequestException(
          "El grado asociado al grupo no tiene un nivel educativo configurado.",
        );
      }

      isStandalone = false;
      level = group.grade.level;
      order = group.grade.order;
    } else {
      if (!dto.standaloneLevel || !dto.standaloneGradeOrder) {
        throw new BadRequestException(
          "Para el modo Standalone, debe proporcionar standaloneLevel y standaloneGradeOrder.",
        );
      }
      isStandalone = true;
      level = dto.standaloneLevel;
      order = dto.standaloneGradeOrder;
    }

    // 4. Predict modality if not provided by teacher
    let modalidad = dto.modalidad;
    if (!modalidad) {
      const modalitySystemPrompt = `Eres un asistente pedagógico experto en la Nueva Escuela Mexicana (NEM).
Dada la descripción de la planeación (contexto inicial) del profesor, debes clasificarla en una de las siguientes 6 modalidades de trabajo:
- PROYECTOS
- ABJ
- CENTROS_INTERES
- TALLERES_CRITICOS
- RINCONES_APRENDIZAJE
- UNIDADES_DIDACTICAS

Responde ÚNICAMENTE con el nombre de la modalidad elegida en mayúsculas, tal como aparecen en la lista. No agregues explicaciones, puntuación ni texto adicional.`;

      const modalityCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: modalitySystemPrompt },
          { role: "user", content: `Contexto del maestro: "${dto.contextoInicial}"` },
        ],
        temperature: 0,
      });

      const responseText = modalityCompletion.choices[0].message?.content?.trim();
      if (responseText && Object.values(PlanningModalidad).includes(responseText as any)) {
        modalidad = responseText as PlanningModalidad;
      } else {
        const found = Object.values(PlanningModalidad).find((m) =>
          responseText?.toUpperCase().includes(m),
        );
        modalidad = found || PlanningModalidad.PROYECTOS;
      }
    }

    // 5. Load modality context from NEM knowledge base (definition + phases with descriptions)
    const modalidadCtx = this.nemKnowledgeService.getModalidad(modalidad);
    if (!modalidadCtx) {
      throw new InternalServerErrorException(
        `No se encontró la modalidad '${modalidad}' en la base de conocimiento NEM.`,
      );
    }

    // 6. Load and ISOLATE exact curricular context (Two-step AI process if not manually provided)
    let fixedContenidoCtx: { campoFormativo: string, contenido: string, pda: string } | null = null;
    if (dto.contenidoId) {
      fixedContenidoCtx = this.nemKnowledgeService.getContenidoExacto(dto.contenidoId, order);
    }
    
    if (!fixedContenidoCtx) {
      // 1st pass AI: Select the best Contenido ID from the catalog
      const catalog = this.nemKnowledgeService.getAllContenidosForAISelection(order, dto.campoFormativo);
      const catalogStr = catalog.map(c => `ID: ${c.id} | Campo: ${c.campoFormativo} | Contenido: ${c.contenido} | PDA: ${c.pda}`).join("\n");
      const selectionPrompt = `Eres un seleccionador experto de currículo escolar. Basado en el Contexto Inicial (tema de la clase): "${dto.contextoInicial}", selecciona el MEJOR contenido de la lista que más se alinee al tema. Responde ÚNICAMENTE con el ID exacto del contenido elegido (ej. ct-LENGUAJES-1). No agregues texto adicional.\n\nCatálogo:\n${catalogStr}`;
      
      const selCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // fast and cheap model for classification
        messages: [{ role: "system", content: selectionPrompt }],
        temperature: 0,
      });
      const chosenId = selCompletion.choices[0].message?.content?.trim();
      if (chosenId) {
        fixedContenidoCtx = this.nemKnowledgeService.getContenidoExacto(chosenId, order);
      }
      if (!fixedContenidoCtx && catalog.length > 0) {
         // fallback to the first one if AI hallucinated an ID
         fixedContenidoCtx = this.nemKnowledgeService.getContenidoExacto(catalog[0].id, order);
      }
    }

    if (!fixedContenidoCtx) {
      throw new InternalServerErrorException("No se pudo resolver un contenido curricular válido.");
    }

    // 7. Build prompt strings from the knowledge base
    const fasesStr = modalidadCtx.fases
      .map((f, idx) => `${idx + 1}. **${f.nombre}**: ${f.descripcion}`)
      .join("\n\n");

    const curriculoStr = `### CAMPO FORMATIVO ASIGNADO: ${fixedContenidoCtx.campoFormativo}\n\n**Contenido Oficial Asignado:**\n${fixedContenidoCtx.contenido}\n\n**PDA Asignado (${order}° grado):**\n${fixedContenidoCtx.pda}`;
    
    // Override the DTO's campoFormativo with the one actually selected
    dto.campoFormativo = fixedContenidoCtx.campoFormativo as CampoFormativo;


    // 8. Build coherence audit instructions
    let auditInstructions = "";
    let sugerenciaIASchema = "";

    if (dto.modalidad) {
      auditInstructions = `
El maestro ya eligió los siguientes valores curriculares de manera fija:
- Modalidad: ${modalidad}
${dto.campoFormativo ? `- Campo Formativo: ${dto.campoFormativo}` : "- Campo Formativo: (No pre-seleccionado por el maestro, elígelo tú)"}
${dto.ejesArticuladores && dto.ejesArticuladores.length > 0 ? `- Ejes Articuladores: ${dto.ejesArticuladores.join(", ")}` : "- Ejes Articuladores: (No pre-seleccionados por el maestro, elígelos tú)"}

INSTRUCCIÓN DE CONTROL DE COHERENCIA (AUDIT):
Debes generar la planeación didáctica usando EXACTAMENTE los valores pre-seleccionados por el maestro (debes colocarlos sin alteración en 'campoFormativo' y 'ejesArticuladores' de tu JSON principal).
Sin embargo, realiza un análisis de coherencia pedagógica. Si consideras que el Contexto Inicial sugiere que alguna opción diferente sería más apropiada (por ejemplo, otra modalidad, otro campo formativo u otros ejes), indica esta propuesta alternativa en el objeto 'sugerenciaIA' justificando tu recomendación en 1 o 2 oraciones. Si los valores pre-seleccionados son idóneos, define 'hayDiscrepancia' como false y los demás campos en null.
`;
      sugerenciaIASchema = `
  "sugerenciaIA": {
    "hayDiscrepancia": boolean,
    "modalidadSugerida": "string (o null)",
    "campoFormativoSugerido": "string (o null)",
    "ejesArticuladoresSugeridos": ["string"] (o null),
    "justificacion": "string (1-2 oraciones que justifiquen el cambio, o null)"
  }
`;
    } else {
      auditInstructions = `
No se ha pre-seleccionado ninguna modalidad, campo formativo ni ejes articuladores. Debes proponerlos de manera inteligente a partir del Contexto Inicial y el Currículo Oficial. En este caso, el campo 'sugerenciaIA' de tu JSON de respuesta debe ser exactamente null.
`;
      sugerenciaIASchema = `
  "sugerenciaIA": null
`;
    }

    // 9. Build the main generation prompt
    const tiemposInstruction = level === NivelEducativo.PREESCOLAR
      ? "Sugerencias de tiempos o duración de las actividades. Al ser nivel preescolar, sugiere duraciones inmersivas que conecten con la vida cotidiana del aula (ej. 'Durante dos semanas, integrando actividades en la rutina diaria') en lugar de tiempos aislados (ej. '1 hora semanal')."
      : "Sugerencias de tiempos o duración de las actividades.";
    const generationSystemPrompt = `Eres un asistente pedagógico experto en la Nueva Escuela Mexicana (NEM).
Tu tarea es generar una planeación didáctica estructurada y coherente basada en la idea del maestro (Contexto Inicial) y las directrices oficiales de la SEP.

═══════════════════════════════════════════════════════════
MODALIDAD DE TRABAJO — ${modalidadCtx.nombre}
═══════════════════════════════════════════════════════════

**Definición oficial (SEP):**
${modalidadCtx.definicion}

**Propósito pedagógico:**
${modalidadCtx.proposito}

**Estructura didáctica — Momentos y descripción de cada fase:**
${fasesStr}

INSTRUCCIÓN CRÍTICA DE LAS FASES: Debes generar EXACTAMENTE las fases listadas arriba, en el mismo orden, usando el nombre exacto de cada fase. Las actividades que generes para cada fase deben ser coherentes con la descripción oficial de ese momento didáctico.

═══════════════════════════════════════════════════════════
CURRÍCULO OFICIAL — Programa Sintético Fase 2 (SEP)
Nivel: ${level} | Grado: ${order}°
═══════════════════════════════════════════════════════════

${curriculoStr}

INSTRUCCIÓN CRÍTICA DEL CURRÍCULO: Arriba se te ha proporcionado un ÚNICO Contenido y un ÚNICO PDA ya aislado y fijado para esta planeación. Tienes ESTRICTAMENTE PROHIBIDO inventar o cambiar estos textos. Debes tomarlos y copiarlos exactamente letra por letra en tu JSON de respuesta en los campos correspondientes. Las actividades que generes deben alinearse estrictamente a ellos.

═══════════════════════════════════════════════════════════
CONTROL CURRICULAR
═══════════════════════════════════════════════════════════

${auditInstructions}

═══════════════════════════════════════════════════════════
FORMATO DE RESPUESTA (JSON estricto)
═══════════════════════════════════════════════════════════

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "title": "Un título creativo y descriptivo para el proyecto",
  "campoFormativo": "El Campo Formativo. Debe ser exactamente uno de estos: LENGUAJES, SABERES_PENSAMIENTO_CIENTIFICO, ETICA_NATURALEZA_SOCIEDADES, HUMANO_COMUNITARIO",
  "ejesArticuladores": ["Uno o más Ejes Articuladores. Deben ser exactamente de esta lista: PENSAMIENTO_CRITICO, VIDA_SALUDABLE, INCLUSION, INTERCULTURALIDAD_CRITICA, IGUALDAD_GENERO, ARTE_CULTURA, APROPIACION_TECNOLOGIA"],
  "contenidos": "TIENES ESTRICTAMENTE PROHIBIDO redactarlo por tu cuenta. Tu única tarea es buscar en el contexto proporcionado cuál es el Contenido que mejor hace 'match' con el tema del usuario y COPIARLO EXACTAMENTE LETRA POR LETRA.",
  "pda": "TIENES ESTRICTAMENTE PROHIBIDO redactarlo por tu cuenta. Tu única tarea es buscar en el contexto proporcionado cuál es el PDA que mejor hace 'match' con el tema del usuario y COPIARLO EXACTAMENTE LETRA POR LETRA.",
  "relevanciaSocial": "Explicación de por qué este proyecto es relevante socialmente para la comunidad escolar del maestro.",
  "produccionSugerida": "El producto o entregable sugerido al finalizar el proyecto didáctico.",
  "proposito": "El propósito o intención pedagógica del proyecto.",
  "fases": [
    {
      "nombre": "Nombre exacto de la fase (igual al que aparece en la Estructura Didáctica arriba)",
      "actividades": "Descripción detallada y concreta de las actividades sugeridas para esta fase, coherentes con la descripción oficial del momento didáctico."
    }
  ],
  "recursos": {
    "espacios": "Descripción de los espacios físicos sugeridos para el proyecto.",
    "tiempos": "${tiemposInstruction}",
    "materiales": "Lista de materiales necesarios."
  },
  ${sugerenciaIASchema.trim()}
}

No agregues ninguna clave adicional fuera del JSON estructurado y asegúrate de que el JSON sea válido.`;

    const userPrompt = `Contexto Inicial del maestro: "${dto.contextoInicial}"
Modalidad de trabajo: "${modalidad}"
Nivel educativo: ${level}
Grado: ${order}°`;

    // 10. Call GPT-4o
    const generationCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: generationSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const jsonText = generationCompletion.choices[0].message?.content;
    if (!jsonText) {
      throw new InternalServerErrorException("No se recibió respuesta del motor de generación de IA.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new InternalServerErrorException("Error al parsear el resultado de la IA.");
    }

    // 11. Helper functions to clean enums
    const cleanCampoFormativo = (cf: string): CampoFormativo => {
      if (cf && Object.values(CampoFormativo).includes(cf as any)) {
        return cf as CampoFormativo;
      }
      return CampoFormativo.LENGUAJES;
    };

    const cleanEjesArticuladores = (ejes: string[]): EjeArticulador[] => {
      if (!Array.isArray(ejes)) return [];
      return ejes.filter((e) =>
        Object.values(EjeArticulador).includes(e as any),
      ) as EjeArticulador[];
    };

    // 12. Teacher pre-selections always override AI output
    const finalCampoFormativo = dto.campoFormativo
      ? dto.campoFormativo
      : cleanCampoFormativo(parsed.campoFormativo);
    const finalEjesArticuladores =
      dto.ejesArticuladores && dto.ejesArticuladores.length > 0
        ? dto.ejesArticuladores
        : cleanEjesArticuladores(parsed.ejesArticuladores);

    // 13. Calculate start of current week (Monday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    // 14. Format phases with index (use names from knowledge base as fallback)
    const phaseNames = modalidadCtx.fases.map((f) => f.nombre);
    const formattedFases = (parsed.fases || []).map((f: any, idx: number) => ({
      nombre: f.nombre || phaseNames[idx] || `Fase ${idx + 1}`,
      actividades: f.actividades || "",
      orden: idx + 1,
    }));

    // 15. Build content markdown
    const contentMarkdown = `
# ${parsed.title || "Planeación Didáctica"}

**Modalidad**: ${modalidad}
**Campo Formativo**: ${finalCampoFormativo}
**Ejes Articuladores**: ${finalEjesArticuladores.join(", ")}

## Propósito
${parsed.proposito || ""}

## Contenidos
${parsed.contenidos || ""}

## Proceso de Desarrollo de Aprendizaje (PDA)
${parsed.pda || ""}

## Relevancia Social
${parsed.relevanciaSocial || ""}

## Producción Sugerida
${parsed.produccionSugerida || ""}

## Fases del Proyecto
${formattedFases.map((f: any) => `### Fase ${f.orden}: ${f.nombre}\n${f.actividades}`).join("\n\n")}
    `.trim();

    // 16. Persist planning
    const planning = await this.prisma.planning.create({
      data: {
        teacherProfileId: resolvedTeacherProfileId,
        groupId: dto.groupId || null,
        subjectId: dto.subjectId || null,
        isStandalone,
        standaloneLevel: isStandalone ? level : null,
        standaloneGradeOrder: isStandalone ? order : null,
        modalidad,
        campoFormativo: finalCampoFormativo,
        ejesArticuladores: finalEjesArticuladores,
        contextoInicial: dto.contextoInicial,
        contenidos: parsed.contenidos || "",
        pda: parsed.pda || "",
        relevanciaSocial: parsed.relevanciaSocial || "",
        produccionSugerida: parsed.produccionSugerida || "",
        fases: formattedFases,
        recursos: parsed.recursos || null,
        title: parsed.title || "Sin título",
        content: contentMarkdown,
        weekStart,
        status: PlanningStatus.DRAFT,
      },
    });

    return {
      planning,
      sugerenciaIA: dto.modalidad ? parsed.sugerenciaIA || null : null,
    };
  }

  async findAll(currentUser: RequestUser): Promise<Planning[]> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return this.prisma.planning.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      return this.prisma.planning.findMany({
        where: {
          teacherProfile: {
            user: {
              schoolId: currentUser.schoolId,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Teacher
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: currentUser.id },
    });
    if (!teacherProfile) {
      return [];
    }

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
      include: {
        teacherProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!planning) {
      throw new NotFoundException("Planeación no encontrada.");
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return planning;
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException("No tiene permisos para acceder a esta planeación.");
      }
      return planning;
    }

    // Teacher
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: currentUser.id },
    });
    if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) {
      throw new ForbiddenException("No es dueño de esta planeación.");
    }

    return planning;
  }

  async update(
    id: string,
    dto: UpdatePlanningDto,
    currentUser: RequestUser,
  ): Promise<Planning> {
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      await this.verifyPlanningActive(currentUser.schoolId);
    }

    const planning = await this.prisma.planning.findUnique({
      where: { id },
      include: {
        teacherProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!planning) {
      throw new NotFoundException("Planeación no encontrada.");
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) {
          throw new ForbiddenException("No tiene permisos para modificar esta planeación.");
        }
      } else {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { userId: currentUser.id },
        });
        if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) {
          throw new ForbiddenException("No es dueño de esta planeación.");
        }
      }
    }

    return this.prisma.planning.update({
      where: { id },
      data: {
        title: dto.title,
        contenidos: dto.contenidos,
        pda: dto.pda,
        relevanciaSocial: dto.relevanciaSocial,
        produccionSugerida: dto.produccionSugerida,
        fases: dto.fases,
        recursos: dto.recursos,
        campoFormativo: dto.campoFormativo,
        ejesArticuladores: dto.ejesArticuladores,
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
      include: {
        teacherProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!planning) {
      throw new NotFoundException("Planeación no encontrada.");
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.role === UserRole.SCHOOL_ADMIN) {
        if (planning.teacherProfile.user.schoolId !== currentUser.schoolId) {
          throw new ForbiddenException("No tiene permisos para eliminar esta planeación.");
        }
      } else {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { userId: currentUser.id },
        });
        if (!teacherProfile || planning.teacherProfileId !== teacherProfile.id) {
          throw new ForbiddenException("No es dueño de esta planeación.");
        }
      }
    }

    await this.prisma.planning.delete({
      where: { id },
    });

    return { success: true };
  }

  async getTeachersList(schoolId: string) {
    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        user: {
          schoolId,
          active: true,
        },
      },
      include: {
        user: true,
      },
    });

    return teachers.map((t) => ({
      id: t.id,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      email: t.user.email,
    }));
  }
}
