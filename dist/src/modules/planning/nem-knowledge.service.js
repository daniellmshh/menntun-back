"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NemKnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const GRADE_KEY_MAP = {
    1: "pda_grado_1",
    2: "pda_grado_2",
    3: "pda_grado_3",
};
const mapModalidadToEnum = (name) => {
    if (name.includes("Proyecto"))
        return client_1.PlanningModalidad.PROYECTOS;
    if (name.includes("ABJ"))
        return client_1.PlanningModalidad.ABJ;
    if (name.includes("Unidad didáctica"))
        return client_1.PlanningModalidad.UNIDADES_DIDACTICAS;
    if (name.includes("Centros de interés"))
        return client_1.PlanningModalidad.CENTROS_INTERES;
    if (name.includes("Rincones de aprendizaje"))
        return client_1.PlanningModalidad.RINCONES_APRENDIZAJE;
    if (name.includes("Taller crítico"))
        return client_1.PlanningModalidad.TALLERES_CRITICOS;
    return null;
};
const mapCampoFormativoToEnum = (name) => {
    if (name.includes("Lenguajes"))
        return client_1.CampoFormativo.LENGUAJES;
    if (name.includes("Saberes y Pensamiento Científico"))
        return client_1.CampoFormativo.SABERES_PENSAMIENTO_CIENTIFICO;
    if (name.includes("Ética, Naturaleza y Sociedades"))
        return client_1.CampoFormativo.ETICA_NATURALEZA_SOCIEDADES;
    if (name.includes("De lo Humano y lo Comunitario"))
        return client_1.CampoFormativo.HUMANO_COMUNITARIO;
    return null;
};
let NemKnowledgeService = class NemKnowledgeService {
    knowledgeBase;
    onModuleInit() {
        const jsonPath = path.join(process.cwd(), "scripts/planes.json");
        const raw = fs.readFileSync(jsonPath, "utf-8");
        this.knowledgeBase = JSON.parse(raw);
    }
    getModalidad(modalidad) {
        const found = this.knowledgeBase.base_conocimiento_nem_fase2.modalidades_de_trabajo_metodologia.find((m) => mapModalidadToEnum(m.nombre_modalidad) === modalidad);
        if (!found)
            return null;
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
    getCurriculumCatalog() {
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
    getAllContenidosForAISelection(gradoNumero, campoFormativo) {
        const pdaKey = GRADE_KEY_MAP[gradoNumero] || "pda_grado_1";
        const campos = this.knowledgeBase.base_conocimiento_nem_fase2.curriculo_programa_sintetico;
        let filteredCampos = campos;
        if (campoFormativo) {
            filteredCampos = campos.filter(c => mapCampoFormativoToEnum(c.campo_formativo) === campoFormativo);
        }
        const flatContenidos = [];
        filteredCampos.forEach((campo) => {
            const enumId = mapCampoFormativoToEnum(campo.campo_formativo) || campo.campo_formativo;
            campo.contenidos.forEach((ct, idx) => {
                flatContenidos.push({
                    id: "ct-" + enumId + "-" + idx,
                    campoFormativo: enumId,
                    contenido: ct.nombre_contenido,
                    pda: ct[pdaKey] || ct.pda_grado_1,
                });
            });
        });
        return flatContenidos;
    }
    getContenidoExacto(contenidoId, gradoNumero) {
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
                    pda: ct[pdaKey] || ct.pda_grado_1,
                };
            }
        }
        return null;
    }
};
exports.NemKnowledgeService = NemKnowledgeService;
exports.NemKnowledgeService = NemKnowledgeService = __decorate([
    (0, common_1.Injectable)()
], NemKnowledgeService);
//# sourceMappingURL=nem-knowledge.service.js.map