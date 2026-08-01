import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole, PrismaClient } from "@prisma/client";
import { REQUIRE_MODULE_KEY } from "../decorators/require-module.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { RequestUser } from "../types";

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject("PRISMA") private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new ForbiddenException("No user in request");
    }

    const headerSchoolId = request.headers["x-active-school-id"];
    const requestedSchoolId =
      typeof headerSchoolId === "string" && headerSchoolId.trim()
        ? headerSchoolId.trim()
        : undefined;

    let activeSchoolId = user.schoolId;

    if (requestedSchoolId && requestedSchoolId !== user.schoolId) {
      if (user.role === UserRole.SUPER_ADMIN) {
        const schoolExists = await this.prisma.school.findUnique({
          where: { id: requestedSchoolId },
          select: { id: true },
        });
        if (!schoolExists) {
          throw new ForbiddenException("Requested school does not exist");
        }
      } else if (user.role === UserRole.ORG_ADMIN && user.organizationId) {
        const organizationSchool = await this.prisma.school.findFirst({
          where: {
            id: requestedSchoolId,
            organizationId: user.organizationId,
          },
          select: { id: true },
        });
        if (!organizationSchool) {
          throw new ForbiddenException("Requested school is outside your organization");
        }
      } else {
        throw new ForbiddenException("You cannot change the active school context");
      }

      activeSchoolId = requestedSchoolId;
    }

    user.activeSchoolId = activeSchoolId;

    if (!requiredModule) {
      // The active context is still validated and propagated to controllers
      // such as /auth/me/modules that do not belong to a paid module.
      return true;
    }

    // SUPER_ADMIN has access to all modules automatically
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Core modules are always active
    const CORE_MODULES = ["auth", "schools"];
    if (CORE_MODULES.includes(requiredModule)) {
      return true;
    }

    if (!activeSchoolId) {
      throw new ForbiddenException("No active school context found for this request");
    }

    // Verify if the module is active for the user's school (or active school for ORG_ADMIN)
    const activeModule = await this.prisma.schoolModule.findFirst({
      where: {
        schoolId: activeSchoolId,
        module: {
          equals: requiredModule,
          mode: "insensitive", // Just in case of casing differences
        },
        active: true,
      },
    });

    if (!activeModule) {
      throw new ForbiddenException(`Module '${requiredModule}' is not active for this school`);
    }

    return true;
  }
}
