import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";
import { PrismaClient } from "@prisma/client";

@Controller()
export class AppController {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  @Public()
  @Get()
  healthCheck() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("debug-links")
  async debugLinks() {
    const parentStudents = await this.prisma.parentStudent.findMany({
      include: {
        parentProfile: { include: { user: true } },
        studentProfile: { include: { user: true } }
      }
    });
    const parents = await this.prisma.user.findMany({
      where: { email: "maria@mama.com" },
      include: { parentProfile: { include: { studentLinks: true } } }
    });
    return { parentStudents, parents };
  }
}
