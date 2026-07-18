import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PlanningModalidad, CampoFormativo, NivelEducativo } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

interface RawPda {
  grado_1: string;
  grado_2: string;
  grado_3: string;
  [key: string]: string; 
}

interface RawContenido {
  id_contenido: string;
  nombre_contenido: string;
  pda: RawPda;
}

interface RawCampoFormativo {
  nombre_campo: string;
  finalidad: string;
  contenidos: RawContenido[];
}

interface RawModalidad {
  nombre_modalidad: string;
  siglas: string;
  definicion: string;
  fases_momento: string[];
}

interface RawKnowledgeBase {
  catalogo_sep_fase2: {
    campos_formativos: RawCampoFormativo[];
    ejes_articuladores: string[];
    metodologias_oficiales: RawModalidad[];
  };
}

interface RawCatalogosOperativos {
  plantilla_planeacion_nem: {
    catalogos_operativos_sara: {
      problematicas_comunes_programa_analitico: string[];
      actividades_pmc: string[];
      ajustes_razonables: string[];
      instrumentos_evaluacion_formativa: string[];
    };
  };
}

@Injectable()
export class NemKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(NemKnowledgeService.name);
  private knowledgeBases = new Map<NivelEducativo, RawKnowledgeBase>();
  private catalogosOperativos!: RawCatalogosOperativos;

  onModuleInit() {
    this.loadCatalogosOperativos();
    this.loadKnowledgeBase(NivelEducativo.PREESCOLAR);
  }

  private resolveJsonPath(nivel: NivelEducativo): string {
    switch (nivel) {
      case NivelEducativo.PREESCOLAR:
        return path.join(process.cwd(), "scripts/curriculo_pedagogico_nem.json");
      case NivelEducativo.PRIMARIA:
        return path.join(process.cwd(), "scripts/curriculo_pedagogico_primaria.json");
      case NivelEducativo.SECUNDARIA:
        return path.join(process.cwd(), "scripts/curriculo_pedagogico_secundaria.json");
      default:
        return path.join(process.cwd(), "scripts/curriculo_pedagogico_nem.json");
    }
  }

  private loadKnowledgeBase(nivel: NivelEducativo): RawKnowledgeBase | null {
    if (this.knowledgeBases.has(nivel)) {
      return this.knowledgeBases.get(nivel)!;
    }

    const jsonPath = this.resolveJsonPath(nivel);
    if (!fs.existsSync(jsonPath)) {
      this.logger.warn(`El archivo JSON para el nivel ${nivel} no existe en la ruta: ${jsonPath}`);
      return null;
    }

    try {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const data = JSON.parse(raw) as RawKnowledgeBase;
      this.knowledgeBases.set(nivel, data);
      return data;
    } catch (e: any) {
      this.logger.error(`Error al cargar el JSON para ${nivel}: ${e.message}`);
      return null;
    }
  }

  private loadCatalogosOperativos() {
    const jsonPath = path.join(process.cwd(), "scripts/estructura_operativa_contexto.json");
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      this.catalogosOperativos = JSON.parse(raw) as RawCatalogosOperativos;
    } else {
      this.logger.warn("estructura_operativa_contexto.json no encontrado.");
    }
  }

  private mapCampoFormativoToEnum(name: string): string {
    if (name.includes("Lenguajes")) return CampoFormativo.LENGUAJES;
    if (name.includes("Saberes y Pensamiento Científico")) return CampoFormativo.SABERES_PENSAMIENTO_CIENTIFICO;
    if (name.includes("Ética, Naturaleza y Sociedades")) return CampoFormativo.ETICA_NATURALEZA_SOCIEDADES;
    if (name.includes("De lo Humano y lo Comunitario")) return CampoFormativo.HUMANO_COMUNITARIO;
    return name;
  }

  private mapModalidadToEnum(name: string): string {
    if (name.includes("Proyecto")) return PlanningModalidad.PROYECTOS;
    if (name.includes("Aprendizaje Basado en Juegos")) return PlanningModalidad.ABJ;
    if (name.includes("Unidad didáctica")) return PlanningModalidad.UNIDADES_DIDACTICAS;
    if (name.includes("Centros de interés")) return PlanningModalidad.CENTROS_INTERES;
    if (name.includes("Rincones de aprendizaje")) return PlanningModalidad.RINCONES_APRENDIZAJE;
    if (name.includes("Taller crítico")) return PlanningModalidad.TALLERES_CRITICOS;
    return name;
  }

  getCatalogo(nivel: NivelEducativo) {
    const kb = this.loadKnowledgeBase(nivel);
    if (!kb) {
      return null;
    }

    const cat = kb.catalogo_sep_fase2;
    return {
      camposFormativos: cat.campos_formativos.map(c => ({
        id: this.mapCampoFormativoToEnum(c.nombre_campo),
        nombre: c.nombre_campo,
        finalidad: c.finalidad,
        contenidos: c.contenidos.map(ct => ({
          id: ct.id_contenido,
          nombre: ct.nombre_contenido
        }))
      })),
      ejesArticuladores: cat.ejes_articuladores || [],
      metodologias: (cat.metodologias_oficiales || []).map(m => ({
        id: this.mapModalidadToEnum(m.nombre_modalidad),
        nombre: m.nombre_modalidad,
        siglas: m.siglas,
        definicion: m.definicion,
        fases: m.fases_momento
      })),
      catalogosOperativos: this.getCatalogosOperativos()
    };
  }

  getContenidosPorSeleccion(
    nivel: NivelEducativo,
    gradeOrder: number,
    selecciones: { campoFormativoId: string; contenidoId: string }[]
  ) {
    const kb = this.loadKnowledgeBase(nivel);
    if (!kb) return [];

    const pdaKey = `grado_${gradeOrder}`;
    const results: { campoFormativo: string; nombreCampo: string; contenido: string; pda: string }[] = [];

    for (const sel of selecciones) {
      const campo = kb.catalogo_sep_fase2.campos_formativos.find(
        c => this.mapCampoFormativoToEnum(c.nombre_campo) === sel.campoFormativoId
      );
      if (campo) {
        const contenido = campo.contenidos.find(ct => ct.id_contenido === sel.contenidoId);
        if (contenido) {
          results.push({
            campoFormativo: sel.campoFormativoId,    // enum e.g. "LENGUAJES"
            nombreCampo: campo.nombre_campo,          // display "Lenguajes"
            contenido: contenido.nombre_contenido,
            pda: contenido.pda[pdaKey] || contenido.pda["grado_1"] || ""
          });
        }
      }
    }
    return results;
  }

  getModalidad(modalidad: PlanningModalidad) {
    const kb = this.loadKnowledgeBase(NivelEducativo.PREESCOLAR);
    if (!kb) return null;

    const found = kb.catalogo_sep_fase2.metodologias_oficiales.find(
      m => this.mapModalidadToEnum(m.nombre_modalidad) === modalidad
    );
    if (!found) return null;

    return {
      nombre: found.nombre_modalidad,
      siglas: found.siglas,
      definicion: found.definicion,
      fases: found.fases_momento
    };
  }

  getCatalogosOperativos() {
    if (!this.catalogosOperativos) {
      return {
        problematicas: [],
        ajustesRazonables: [],
        actividadesPmc: [],
        instrumentosEvaluacion: []
      };
    }
    const cat = this.catalogosOperativos.plantilla_planeacion_nem.catalogos_operativos_sara;
    return {
      problematicas: cat.problematicas_comunes_programa_analitico || [],
      ajustesRazonables: cat.ajustes_razonables || [],
      actividadesPmc: cat.actividades_pmc || [],
      instrumentosEvaluacion: cat.instrumentos_evaluacion_formativa || []
    };
  }
}
