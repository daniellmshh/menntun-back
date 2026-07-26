import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { PrismaModule } from "./lib/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { AcademicModule } from "./modules/academic/academic.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { StudentsModule } from "./modules/students/students.module";
import { PlanningModule } from "./modules/planning/planning.module";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ModulesGuard } from "./common/guards/modules.guard";
import { AppController } from "./app.controller";
import { OrganizationsModule } from './modules/organizations/organizations.module';

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
    EnrollmentsModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModulesGuard,
    },
  ],
})
export class AppModule {}
