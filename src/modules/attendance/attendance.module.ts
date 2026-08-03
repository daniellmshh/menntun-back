import { Module } from "@nestjs/common";
import { PrismaModule } from "../../lib/prisma.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceScheduler } from "./attendance.scheduler";
import { AttendanceService } from "./attendance.service";
import { AttendanceNotificationsService } from "./attendance-notifications.service";

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceScheduler, AttendanceNotificationsService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
