import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  OrdemDeServicoRepository,
  FindAllParams,
  PaginatedResult,
  TempoMedioFilters,
  TempoMedioExecucaoResult,
} from "../domain/ordem-de-servico.repository";
import { OrdemDeServico } from "../domain/ordem-de-servico.entity";
import { StatusOS } from "../domain/value-objects/status-os.vo";
import {
  ItemServicoOS,
  StatusExecucaoItem,
} from "../domain/value-objects/item-servico-os.vo";
import { ItemProdutoOS } from "../domain/value-objects/item-produto-os.vo";

const INCLUDE_ITENS = {
  itensServico: { include: { produtos: true } },
} as const;

@Injectable()
export class PrismaOrdemDeServicoRepository implements OrdemDeServicoRepository {
  constructor(private prisma: PrismaService) {}

  async create(os: OrdemDeServico): Promise<OrdemDeServico> {
    const data = await this.prisma.ordemDeServico.create({
      data: {
        numero: os.numero,
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
        usuarioId: os.usuarioId,
        descricaoInicial: os.descricaoInicial,
        diagnostico: os.diagnostico,
        status: os.status,
        // OS aberta ja com servicos/pecas (US abertura): grava os itens
        // aninhados junto do cabecalho, espelhando o nested-write do update().
        itensServico: {
          create: os.itensServico.map((item) => ({
            servicoId: item.servicoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            statusExecucao: item.statusExecucao,
            inicioExecucao: item.inicioExecucao,
            fimExecucao: item.fimExecucao,
            horasTrabalhadas: item.horasTrabalhadas,
            produtos: {
              create: item.produtos.map((p) => ({
                produtoId: p.produtoId,
                quantidade: p.quantidade,
                precoUnitario: p.precoUnitario,
              })),
            },
          })),
        },
      },
      include: INCLUDE_ITENS,
    });
    return this.toDomain(data);
  }

  async findById(id: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { id },
      include: INCLUDE_ITENS,
    });
    return data ? this.toDomain(data) : null;
  }

  async findAll(
    params: FindAllParams,
  ): Promise<PaginatedResult<OrdemDeServico>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.clienteId) where.clienteId = params.clienteId;
    if (params.status) where.status = params.status;
    if (params.numero)
      where.numero = { contains: params.numero, mode: "insensitive" };

    // Excluir OS encerradas (estados terminais) por padrão. CANCELADA também é
    // terminal e acumula indefinidamente, então entra na exclusão junto com
    // FINALIZADA/ENTREGUE — do contrário o working set carregado em memória
    // (ver abaixo) cresceria sem limite.
    if (!params.incluirEncerradas) {
      where.NOT = [
        { status: "FINALIZADA" },
        { status: "ENTREGUE" },
        { status: "CANCELADA" },
      ];
    }

    // A ordenação exigida é por PRIORIDADE de status (EM_EXECUCAO >
    // AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA) e, dentro do mesmo
    // status, mais antigas primeiro. Essa prioridade não é o mesmo que a ordem
    // do enum no banco, então não é expressável via `orderBy` do Prisma.
    // Buscamos todas as OS que casam com o filtro, ordenamos em memória e só
    // então recortamos a página — garantindo ordem correta ENTRE páginas
    // (paginar antes de ordenar deixaria cada página com um conjunto arbitrário).
    // O working set é naturalmente limitado: por padrão as OS em estado
    // terminal (FINALIZADA/ENTREGUE/CANCELADA) — os conjuntos que crescem
    // indefinidamente — ficam de fora, restando apenas as OS ativas da oficina.
    const [data, total] = await Promise.all([
      this.prisma.ordemDeServico.findMany({
        where,
        include: INCLUDE_ITENS,
      }),
      this.prisma.ordemDeServico.count({ where }),
    ]);

    const statusPriority: { [key: string]: number } = {
      EM_EXECUCAO: 0,
      AGUARDANDO_APROVACAO: 1,
      EM_DIAGNOSTICO: 2,
      RECEBIDA: 3,
      CANCELADA: 4,
      FINALIZADA: 5,
      ENTREGUE: 6,
    };

    const sortedData = [...data].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 999;
      const priorityB = statusPriority[b.status] ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Se mesmo status, ordenar por createdAt (mais antigas primeiro)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Paginação aplicada APÓS a ordenação global.
    const pageData = sortedData.slice(skip, skip + limit);

    return {
      data: pageData.map((d) => this.toDomain(d)),
      total,
      page,
      limit,
    };
  }

  async findByNumero(numero: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { numero },
      include: INCLUDE_ITENS,
    });
    return data ? this.toDomain(data) : null;
  }

  async update(os: OrdemDeServico): Promise<OrdemDeServico> {
    const data = await this.prisma.$transaction(async (tx) => {
      await tx.ordemDeServico.update({
        where: { id: os.id },
        data: {
          descricaoInicial: os.descricaoInicial,
          diagnostico: os.diagnostico,
          status: os.status,
          usuarioId: os.usuarioId,
        },
      });
      // Cascade do FK em produtos descarta os filhos junto.
      await tx.itemOrdemDeServicoServico.deleteMany({
        where: { ordemDeServicoId: os.id },
      });
      for (const item of os.itensServico) {
        await tx.itemOrdemDeServicoServico.create({
          data: {
            ordemDeServicoId: os.id as string,
            servicoId: item.servicoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            statusExecucao: item.statusExecucao,
            inicioExecucao: item.inicioExecucao,
            fimExecucao: item.fimExecucao,
            horasTrabalhadas: item.horasTrabalhadas,
            produtos: {
              create: item.produtos.map((p) => ({
                produtoId: p.produtoId,
                quantidade: p.quantidade,
                precoUnitario: p.precoUnitario,
              })),
            },
          },
        });
      }
      return tx.ordemDeServico.findUnique({
        where: { id: os.id },
        include: INCLUDE_ITENS,
      });
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ordemDeServico.delete({
      where: { id },
    });
  }

  async existsByNumero(numero: string): Promise<boolean> {
    const count = await this.prisma.ordemDeServico.count({
      where: { numero },
    });
    return count > 0;
  }

  async getTempoMedioExecucao(
    filters: TempoMedioFilters,
  ): Promise<TempoMedioExecucaoResult> {
    // A metrica usa horas_trabalhadas (fonte de verdade declarada pelo mecanico
    // ao concluir o servico), nao o tempo decorrido entre inicio_execucao e
    // fim_execucao. O campo do dialog vem pre-preenchido com o tempo decorrido
    // como sugestao, mas o mecanico pode ajustar.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`i.status_execucao = 'CONCLUIDO'`,
      Prisma.sql`i.horas_trabalhadas IS NOT NULL`,
      Prisma.sql`i.fim_execucao IS NOT NULL`,
    ];
    if (filters.servicoId) {
      // i.servico_id eh TEXT (nao UUID), entao nao precisa cast
      conditions.push(Prisma.sql`i.servico_id = ${filters.servicoId}`);
    }
    if (filters.dataInicio) {
      conditions.push(Prisma.sql`i.fim_execucao >= ${filters.dataInicio}`);
    }
    if (filters.dataFim) {
      conditions.push(Prisma.sql`i.fim_execucao <= ${filters.dataFim}`);
    }
    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const rows = await this.prisma.$queryRaw<
      {
        servicoId: string;
        servicoNome: string;
        totalConcluidos: bigint;
        tempoMedioHorasDeclaradas: number | null;
      }[]
    >(Prisma.sql`
      SELECT
        s.id   AS "servicoId",
        s.nome AS "servicoNome",
        COUNT(*)::bigint AS "totalConcluidos",
        AVG(i.horas_trabalhadas)::float AS "tempoMedioHorasDeclaradas"
      FROM item_ordem_de_servico_servico i
      JOIN servico s ON s.id = i.servico_id
      ${whereSql}
      GROUP BY s.id, s.nome
      ORDER BY s.nome ASC
    `);

    const porServico = rows.map((r) => {
      const horas = r.tempoMedioHorasDeclaradas ?? 0;
      const minutos = horas * 60;
      return {
        servicoId: r.servicoId,
        servicoNome: r.servicoNome,
        totalConcluidos: Number(r.totalConcluidos),
        tempoMedioMinutos: Number(minutos.toFixed(2)),
        tempoMedioHoras: Number(horas.toFixed(2)),
      };
    });

    const totalServicosConcluidos = porServico.reduce(
      (sum, s) => sum + s.totalConcluidos,
      0,
    );
    const somaPonderada = porServico.reduce(
      (sum, s) => sum + s.tempoMedioMinutos * s.totalConcluidos,
      0,
    );
    const tempoMedioGeralMinutos =
      totalServicosConcluidos > 0
        ? Number((somaPonderada / totalServicosConcluidos).toFixed(2))
        : 0;

    return {
      totalServicosConcluidos,
      tempoMedioGeralMinutos,
      tempoMedioGeralHoras: Number((tempoMedioGeralMinutos / 60).toFixed(2)),
      porServico,
    };
  }

  private toDomain(data: any): OrdemDeServico {
    const itensServico: ItemServicoOS[] = (data.itensServico ?? []).map(
      (i: any) => {
        const produtos: ItemProdutoOS[] = (i.produtos ?? []).map(
          (p: any) =>
            new ItemProdutoOS(
              p.produtoId,
              p.quantidade,
              Number(p.precoUnitario),
            ),
        );
        return new ItemServicoOS(
          i.servicoId,
          i.quantidade,
          Number(i.precoUnitario),
          (i.statusExecucao ?? "PENDENTE") as StatusExecucaoItem,
          i.inicioExecucao ?? null,
          i.fimExecucao ?? null,
          i.horasTrabalhadas ?? null,
          produtos,
        );
      },
    );
    return OrdemDeServico.reconstitute({
      id: data.id,
      numero: data.numero,
      clienteId: data.clienteId,
      veiculoId: data.veiculoId,
      usuarioId: data.usuarioId,
      descricaoInicial: data.descricaoInicial,
      diagnostico: data.diagnostico,
      status: data.status as StatusOS,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      itensServico,
    });
  }
}
