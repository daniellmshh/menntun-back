import { Injectable, OnModuleInit } from "@nestjs/common";
import { PlanningModalidad, CampoFormativo } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NemFaseDef {
  nombre: string;
  descripcion: string;
}

export interface NemModalidadContext {
  id: string; // The enum value
  nombre: string; // Original name
  definicion: string;
  proposito: string;
  fases: NemFaseDef[];
}

export interface NemContenidoContext {
  id: string; // Generated ID for frontend selection
  contenido: string;
  pda: string;
}

export interface NemCurriculoContext {
  campoFormativoId: string;
  campoFormativoNombre: string;
  finalidad: string;
  contenidos: NemContenidoContext[];
}

export interface CurriculumCatalogResponse {
  campoFormativoId: string;
  campoFormativoNombre: string;
  contenidos: {
    id: string;
    contenido: string;
  }[];
}

// ─── Raw JSON shapes from planes.json ────────────────────────────────────────

interface RawFase {
  momento: string;
  descripcion: string;
}

interface RawModalidad {
  nombre_modalidad: string;
  definicion: string;
  proposito: string;
  estructura_didactica: RawFase[];
}

interface RawContenido {
  nombre_contenido: string;
  pda_grado_1: string;
  pda_grado_2: string;
  pda_grado_3: string;
}

interface RawCampoFormativo {
  campo_formativo: string;
  finalidad: string;
  contenidos: RawContenido[];
}

interface RawKnowledgeBase {
  base_conocimiento_nem_fase2: {
    modalidades_de_trabajo_metodologia: RawModalidad[];
    curriculo_programa_sintetico: RawCampoFormativo[];
  };
}

// ─── Mapping from Prisma enum → grado key in JSON ───────────────────────────

const GRADE_KEY_MAP: Record<number, keyof Pick<RawContenido, "pda_grado_1" | "pda_grado_2" | "pda_grado_3">> = {
  1: "pda_grado_1",
  2: "pda_grado_2",
  3: "pda_grado_3",
};

// ─── Mapping Strings to Enums ───────────────────────────────────────────────

const mapModalidadToEnum = (name: string): PlanningModalidad | null => {
  if (name.includes("Proyecto")) return PlanningModalidad.PROYECTOS;
  if (name.includes("ABJ")) return PlanningModalidad.ABJ;
  if (name.includes("Unidad didáctica")) return PlanningModalidad.UNIDADES_DIDACTICAS;
  if (name.includes("Centros de interés")) return PlanningModalidad.CENTROS_INTERES;
  if (name.includes("Rincones de aprendizaje")) return PlanningModalidad.RINCONES_APRENDIZAJE;
  if (name.includes("Taller crítico")) return PlanningModalidad.TALLERES_CRITICOS;
  return null;
};

const mapCampoFormativoToEnum = (name: string): CampoFormativo | null => {
  if (name.includes("Lenguajes")) return CampoFormativo.LENGUAJES;
  if (name.includes("Saberes y Pensamiento Científico")) return CampoFormativo.SABERES_PENSAMIENTO_CIENTIFICO;
  if (name.includes("Ética, Naturaleza y Sociedades")) return CampoFormativo.ETICA_NATURALEZA_SOCIEDADES;
  if (name.includes("De lo Humano y lo Comunitario")) return CampoFormativo.HUMANO_COMUNITARIO;
  return null;
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class NemKnowledgeService implements OnModuleInit {
  private knowledgeBase!: RawKnowledgeBase;

  onModuleInit() {
    const jsonPath = path.join(
      process.cwd(),
      "scripts/planes.json",
    );
    const raw = fs.readFileSync(jsonPath, "utf-8");
    this.knowledgeBase = JSON.parse(raw) as RawKnowledgeBase;
  }

  getModalidad(modalidad: PlanningModalidad): NemModalidadContext | null {
    const found = this.knowledgeBase.base_conocimiento_nem_fase2.modalidades_de_trabajo_metodologia.find(
      (m) => mapModalidadToEnum(m.nombre_modalidad) === modalidad,
    );
    if (!found) return null;

    return {
      id: modalidad,
      nombre: found.nombre_modalidad,
      definicion: found.definicion,
      proposito: found.proposito,
      fases: found.estructura_didactica.map((f) => ({
        nombre: f.momento,
        descripcion: f.descripcion,
      })),
    };
  }

  // Obtains the entire catalog mapping for the UI (without PDAs)
  getCurriculumCatalog(): CurriculumCatalogResponse[] {
    const campos = this.knowledgeBase.base_conocimiento_nem_fase2.curriculo_programa_sintetico;
    
    return campos.map((campo) => {
      const enumId = mapCampoFormativoToEnum(campo.campo_formativo) || campo.campo_formativo;
      return {
        campoFormativoId: enumId,
        campoFormativoNombre: campo.campo_formativo,
        contenidos: campo.contenidos.map((ct, idx) => ({
          id: "ct-" + enumId + "-" + idx,
          contenido: ct.nombre_contenido,
        })),
      };
    });
  }

  // Returns all contenidos strictly mapped for AI single-shot selection if left blank
  getAllContenidosForAISelection(gradoNumero: number, campoFormativo?: CampoFormativo) {
    const pdaKey = GRADE_KEY_MAP[gradoNumero] || "pda_grado_1";
    const campos = this.knowledgeBase.base_conocimiento_nem_fase2.curriculo_programa_sintetico;

    let filteredCampos = campos;
    if (campoFormativo) {
      filteredCampos = campos.filter(c => mapCampoFormativoToEnum(c.campo_formativo) === campoFormativo);
    }

    const flatContenidos: { id: string, campoFormativo: string, contenido: string, pda: string }[] = [];

    filteredCampos.forEach((campo) => {
      const enumId = mapCampoFormativoToEnum(campo.campo_formativo) || campo.campo_formativo;
      campo.contenidos.forEach((ct, idx) => {
        flatContenidos.push({
          id: "ct-" + enumId + "-" + idx,
          campoFormativo: enumId,
          contenido: ct.nombre_contenido,
          pda: ct[pdaKey] as string || ct.pda_grado_1,
        });
      });
    });

    return flatContenidos;
  }

  // Returns the EXACT match for injecting as a hardcoded variable in generation
  getContenidoExacto(contenidoId: string, gradoNumero: number): { campoFormativo: string, contenido: string, pda: string } | null {
    const pdaKey = GRADE_KEY_MAP[gradoNumero] || "pda_grado_1";
    const campos = this.knowledgeBase.base_conocimiento_nem_fase2.curriculo_programa_sintetico;

    for (const campo of campos) {
      const enumId = mapCampoFormativoToEnum(campo.campo_formativo) || campo.campo_formativo;
      const foundIdx = campo.contenidos.findIndex((_, idx) => "ct-" + enumId + "-" + idx === contenidoId);
      
      if (foundIdx !== -1) {
        const ct = campo.contenidos[foundIdx];
        return {
          campoFormativo: enumId,
          contenido: ct.nombre_contenido,
          pda: ct[pdaKey] as string || ct.pda_grado_1,
        };
      }
    }
    return null;
  }
}
