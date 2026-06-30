import { OnModuleInit } from "@nestjs/common";
import { PlanningModalidad, CampoFormativo } from "@prisma/client";
export interface NemFaseDef {
    nombre: string;
    descripcion: string;
}
export interface NemModalidadContext {
    id: string;
    nombre: string;
    definicion: string;
    proposito: string;
    fases: NemFaseDef[];
}
export interface NemContenidoContext {
    id: string;
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
export declare class NemKnowledgeService implements OnModuleInit {
    private knowledgeBase;
    onModuleInit(): void;
    getModalidad(modalidad: PlanningModalidad): NemModalidadContext | null;
    getCurriculumCatalog(): CurriculumCatalogResponse[];
    getAllContenidosForAISelection(gradoNumero: number, campoFormativo?: CampoFormativo): {
        id: string;
        campoFormativo: string;
        contenido: string;
        pda: string;
    }[];
    getContenidoExacto(contenidoId: string, gradoNumero: number): {
        campoFormativo: string;
        contenido: string;
        pda: string;
    } | null;
}
