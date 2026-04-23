import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Cliente } from "../domain/cliente.entity";
import {
  ClienteRepository,
  FindAllParams,
  PaginatedResult,
} from "../domain/cliente.repository";

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.cliente.findFirst({
      where: {
        cpfCnpj,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return record !== null;
  }

  async create(cliente: Cliente): Promise<Cliente> {
    const record = await this.prisma.cliente.create({
      data: {
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj.value,
        telefone: cliente.telefone,
        email: cliente.email ?? null,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<Cliente | null> {
    const record = await this.prisma.cliente.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const record = await this.prisma.cliente.findUnique({ where: { cpfCnpj } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Cliente>> {
    const { page, limit, nome, cpf, cnpj } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (nome) {
      where.nome = { contains: nome, mode: "insensitive" as const };
    }
    if (cpf) {
      where.cpfCnpj = { contains: cpf, mode: "insensitive" as const };
    }
    if (cnpj) {
      where.cpfCnpj = { contains: cnpj, mode: "insensitive" as const };
    }

    const [records, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  async update(cliente: Cliente): Promise<Cliente> {
    const record = await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email ?? null,
      },
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cliente.delete({ where: { id } });
  }

  private toDomain(record: {
    id: string;
    nome: string;
    cpfCnpj: string;
    telefone: string;
    email: string | null;
  }): Cliente {
    return Cliente.reconstitute({
      id: record.id,
      nome: record.nome,
      cpfCnpj: record.cpfCnpj,
      telefone: record.telefone,
      email: record.email,
    });
  }
}
