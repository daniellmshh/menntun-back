import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { PrismaModule } from "./lib/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { AcademicModule } from "./modules/academic/academic.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { StudentsModule } from "./modules/students/students.module";
import { PlanningModule } from "./modules/planning/planning.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    SchoolsModule,
    AcademicModule,
    TeachersModule,
    StudentsModule,
    PlanningModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
