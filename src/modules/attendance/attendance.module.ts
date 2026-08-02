import { Module } from "@nestjs/common";
import { PrismaModule } from "../../lib/prisma.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceScheduler } from "./attendance.scheduler";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceScheduler],
  exports: [AttendanceService],
})
export class AttendanceModule {}
