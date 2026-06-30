import { PrismaClient, Planning } from "@prisma/client";
import { GeneratePlanningDto, UpdatePlanningDto } from "./planning.dto";
import { RequestUser } from "../../common/types";
import { NemKnowledgeService } from "./nem-knowledge.service";
export declare class PlanningGenerationService {
    private readonly prisma;
    private readonly nemKnowledgeService;
    constructor(prisma: PrismaClient, nemKnowledgeService: NemKnowledgeService);
    private verifyPlanningActive;
    private checkAcademicActive;
    generatePlanning(dto: GeneratePlanningDto, currentUser: RequestUser): Promise<{
        planning: Planning;
        sugerenciaIA: any;
    }>;
    findAll(currentUser: RequestUser): Promise<Planning[]>;
    findById(id: string, currentUser: RequestUser): Promise<Planning>;
    update(id: string, dto: UpdatePlanningDto, currentUser: RequestUser): Promise<Planning>;
    delete(id: string, currentUser: RequestUser): Promise<{
        success: boolean;
    }>;
    getTeachersList(schoolId: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    }[]>;
}
