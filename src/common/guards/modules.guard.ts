import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole, PrismaClient } from "@prisma/client";
import { REQUIRE_MODULE_KEY } from "../decorators/require-module.decorator";
import { RequestUser } from "../types";

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject("PRISMA") private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      // If no module is required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      throw new ForbiddenException("No user in request");
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

    // Verify if the module is active for the user's school
    const activeModule = await this.prisma.schoolModule.findFirst({
      where: {
        schoolId: user.schoolId,
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
