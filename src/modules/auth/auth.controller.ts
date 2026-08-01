import {
  Controller,
  Post,
  Get,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser, successResponse } from "../../common/types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("sync")
  async sync(@Headers("authorization") authHeader: string) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }
    const token = authHeader.split(" ")[1];
    const user = await this.authService.syncUser(token);
    return successResponse(user);
  }

  @Get("me")
  async me(@CurrentUser() user: RequestUser) {
    const fullUser = await this.authService.getMe(user.id);
    return successResponse(fullUser);
  }

  @Get("me/modules")
  async meModules(@CurrentUser() user: RequestUser) {
    const modules = await this.authService.getMeModules(user);
    return successResponse(modules);
  }
}
