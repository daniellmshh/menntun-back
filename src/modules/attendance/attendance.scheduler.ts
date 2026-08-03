import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AttendanceService } from "./attendance.service";

@Injectable()
export class AttendanceScheduler {
  private readonly logger = new Logger(AttendanceScheduler.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async closeDueDays() {
    try {
      await this.attendanceService.closeDueDays();
    } catch (error) {
      this.logger.error("No se pudo ejecutar el cierre diario de asistencias", error instanceof Error ? error.stack : undefined);
    }
  }
}
