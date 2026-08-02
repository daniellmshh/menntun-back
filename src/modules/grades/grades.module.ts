import { Module } from "@nestjs/common";
import { PrismaModule } from "../../lib/prisma.module";
import { GradesController } from "./grades.controller";
import { GradesService } from "./grades.service";

@Module({
  imports: [PrismaModule],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
