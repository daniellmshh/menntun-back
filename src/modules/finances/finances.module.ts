import { Module } from "@nestjs/common";
import { FinancesController } from "./finances.controller";
import { FinancesService } from "./finances.service";
import { PrismaModule } from "../../lib/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FinancesController],
  providers: [FinancesService],
  exports: [FinancesService],
})
export class FinancesModule {}
