import { Injectable, Inject, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaClient, CargoEstado, TipoCargo } from "@prisma/client";
import { RequestUser } from "../../common/types";
import {
  CreateCatalogoCargoDto,
  UpdateCatalogoCargoDto,
  CreateCargoDto,
  UpdateCargoDto,
  CreatePagoDto,
} from "./finances.dto";

@Injectable()
export class FinancesService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  // ─── Catálogo de Cargos ────────────────────────────────

  async getCatalogo(schoolId: string) {
    return this.prisma.catalogoCargo.findMany({
      where: { schoolId },
      orderBy: { nombre: "asc" },
    });
  }

  async createCatalogoCargo(schoolId: string, dto: CreateCatalogoCargoDto) {
    // Verificar que no exista otro con el mismo nombre en la escuela
    const existing = await this.prisma.catalogoCargo.findUnique({
      where: { schoolId_nombre: { schoolId, nombre: dto.nombre } },
    });
    if (existing) {
      throw new BadRequestException("Ya existe un cargo en el catálogo con ese nombre");
    }

    return this.prisma.catalogoCargo.create({
      data: {
        schoolId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        monto: dto.monto,
        tipo: dto.tipo || TipoCargo.MANUAL,
        activo: dto.activo ?? true,
      },
    });
  }

  async updateCatalogoCargo(id: string, schoolId: string, dto: UpdateCatalogoCargoDto) {
    const existing = await this.prisma.catalogoCargo.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException("Cargo de catálogo no encontrado");

    return this.prisma.catalogoCargo.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCatalogoCargo(id: string, schoolId: string) {
    const existing = await this.prisma.catalogoCargo.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException("Cargo de catálogo no encontrado");

    return this.prisma.catalogoCargo.delete({ where: { id } });
  }

  // ─── Cargos (Cuenta por Cobrar) ────────────────────────

  async getCargos(schoolId: string, studentProfileId?: string) {
    const where: any = { schoolId };
    if (studentProfileId) {
      where.studentProfileId = studentProfileId;
    }

    return this.prisma.cargo.findMany({
      where,
      include: {
        studentProfile: { include: { user: true } },
        catalogoCargo: true,
        pagos: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCargo(schoolId: string, dto: CreateCargoDto) {
    return this.prisma.cargo.create({
      data: {
        schoolId,
        studentProfileId: dto.studentProfileId,
        schoolYearId: dto.schoolYearId,
        catalogoCargoId: dto.catalogoCargoId,
        solicitudInscripcionId: dto.solicitudInscripcionId,
        concepto: dto.concepto,
        monto: dto.monto,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
        notas: dto.notas,
        estado: CargoEstado.PENDIENTE,
        saldo: 0,
      },
    });
  }

  async updateCargo(id: string, schoolId: string, dto: UpdateCargoDto) {
    const cargo = await this.prisma.cargo.findFirst({ where: { id, schoolId } });
    if (!cargo) throw new NotFoundException("Cargo no encontrado");

    return this.prisma.cargo.update({
      where: { id },
      data: {
        notas: dto.notas,
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
      },
    });
  }

  async deleteCargo(id: string, schoolId: string) {
    const cargo = await this.prisma.cargo.findFirst({ where: { id, schoolId }, include: { pagos: true } });
    if (!cargo) throw new NotFoundException("Cargo no encontrado");

    if (cargo.pagos.length > 0) {
      throw new BadRequestException("No se puede eliminar un cargo que ya tiene pagos registrados");
    }

    return this.prisma.cargo.delete({ where: { id } });
  }

  // ─── Pagos ─────────────────────────────────────────────

  async registerPago(cargoId: string, schoolId: string, dto: CreatePagoDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const cargo = await tx.cargo.findFirst({
        where: { id: cargoId, schoolId },
      });

      if (!cargo) throw new NotFoundException("Cargo no encontrado");
      if (cargo.estado === CargoEstado.LIQUIDADO || cargo.estado === CargoEstado.CANCELADO) {
        throw new BadRequestException("No se pueden registrar pagos en cargos liquidados o cancelados");
      }

      // Validar monto
      const nuevoSaldo = Number(cargo.saldo) + dto.monto;
      if (nuevoSaldo > Number(cargo.monto)) {
        throw new BadRequestException(`El pago excede el monto del cargo. Monto total: ${cargo.monto}, Saldo actual: ${cargo.saldo}`);
      }

      // Crear el pago
      const pago = await tx.pago.create({
        data: {
          cargoId,
          monto: dto.monto,
          metodo: dto.metodo,
          referencia: dto.referencia,
          notas: dto.notas,
          creadoPor: user.id,
        },
      });

      // Actualizar estado del cargo
      let nuevoEstado: CargoEstado = CargoEstado.PARCIAL;
      if (nuevoSaldo === Number(cargo.monto)) {
        nuevoEstado = CargoEstado.LIQUIDADO;
      }

      await tx.cargo.update({
        where: { id: cargoId },
        data: {
          saldo: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      return pago;
    });
  }
}
