import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";
import { successResponse } from "./common/types";

@Controller()
export class AppController {
  @Public()
  @Get()
  healthCheck() {
    return successResponse({ status: "ok", timestamp: new Date().toISOString() });
  }
}
