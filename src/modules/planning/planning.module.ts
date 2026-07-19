import { Module } from "@nestjs/common";
import { PlanningController } from "./planning.controller";
import { PlanningGenerationService } from "./planning-generation.service";
import { NemKnowledgeService } from "./nem-knowledge.service";
import { PlanningExportService } from "./planning-export.service";
import { PrismaModule } from "../../lib/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PlanningController],
  providers: [PlanningGenerationService, NemKnowledgeService, PlanningExportService],
  exports: [PlanningGenerationService, NemKnowledgeService, PlanningExportService],
})
export class PlanningModule {}
