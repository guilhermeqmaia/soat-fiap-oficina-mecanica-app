import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  ClienteRepository,
  PaginationParams,
  PaginatedResult,
} from "./cliente.repository";
import { Cliente } from "./cliente.entity";

@Injectable()
export class PrismaClienteRepository implements ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(cliente: Cliente): Promise<Cliente> {
    const record = await this.prisma.cliente.create({
      data: {
        nome: cliente.nome,
        cpfCnpj: cliente.getCpfCnpjValue(),
        email: cliente.email,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
      },
    });
    return Cliente.create(record);
  }

  async findById(id: string): Promise<Cliente | null> {
    const record = await this.prisma.cliente.findUnique({
      where: { id, ativo: true },
    });
    return record ? Cliente.create(record) : null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const sanitized = cpfCnpj.replace(/\D/g, "");
    const record = await this.prisma.cliente.findUnique({
      where: { cpfCnpj: sanitized, ativo: true },
    });
    return record ? Cliente.create(record) : null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResult<Cliente>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where: { ativo: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.cliente.count({ where: { ativo: true } }),
    ]);

    return {
      data: records.map((r) => Cliente.create(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Partial<Cliente>): Promise<Cliente> {
    const record = await this.prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        endereco: data.endereco,
      },
    });
    return Cliente.create(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.cliente.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async hasActiveOrdemDeServico(clienteId: string): Promise<boolean> {
    // Nota: Este metodo sera implementado por completo quando o model
    // OrdemDeServico existir no Prisma. Por enquanto, retorna false.
    // Quando OrdemDeServico for criada, descomentar o codigo abaixo:
    //
    // const count = await this.prisma.ordemDeServico.count({
    //   where: {
    //     clienteId,
    //     status: {
    //       in: ['RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_EXECUCAO'],
    //     },
    //   },
    // });
    // return count > 0;

    return false;
  }
}
