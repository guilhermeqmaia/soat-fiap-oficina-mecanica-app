import { Inject, Injectable } from '@nestjs/common';
import { criarEnvelope, OUTBOX_REPOSITORY, OutboxRepository } from '@guilhermeqmaia/oficina-kit/messaging';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConcurrentModificationError } from '../../domain/errors/concurrent-modification.error';
import { Compensacao, PassoHistorico, PassoSaga, SagaOS, StatusSaga } from '../domain/saga-os.entity';
import { SagaRepository } from '../domain/saga.repository';

/** Tabela `saga_os`; os comandos pendentes vao para o outbox na mesma transacao. */
@Injectable()
export class PrismaSagaRepository implements SagaRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) private readonly outbox: OutboxRepository<unknown>,
  ) {}

  async findByNumero(numero: string): Promise<SagaOS | null> {
    const row = await this.prisma.sagaOS.findUnique({ where: { numero } });
    return row ? this.toDomain(row) : null;
  }

  async save(saga: SagaOS): Promise<SagaOS> {
    const data = {
      numero: saga.numero,
      clienteId: saga.clienteId,
      veiculoId: saga.veiculoId,
      descricaoProblema: saga.descricaoProblema,
      passo: saga.passo,
      status: saga.status,
      historico: saga.historico as unknown as object[],
      compensacoes: saga.compensacoes as unknown as object[],
      prazoAprovacao: saga.prazoAprovacao,
      prazoPagamento: saga.prazoPagamento,
    };
    const row = await this.prisma.$transaction(async (tx) => {
      let id = saga.id;
      if (!id) {
        id = (await tx.sagaOS.create({ data })).id;
      } else {
        const { count } = await tx.sagaOS.updateMany({
          where: { id, version: saga.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (count === 0) throw new ConcurrentModificationError(`saga ${saga.numero}`);
      }
      for (const comando of saga.consumirComandos()) {
        await this.outbox.gravar(
          criarEnvelope({
            type: comando.type,
            data: comando.data,
            producer: 'os-service',
            correlationId: saga.numero,
            causationId: comando.causationId,
          }),
          tx,
        );
      }
      return tx.sagaOS.findUniqueOrThrow({ where: { id } });
    });
    return this.toDomain(row);
  }

  async findComPrazoVencido(agora: Date, limite = 100): Promise<SagaOS[]> {
    const rows = await this.prisma.sagaOS.findMany({
      where: {
        status: StatusSaga.EM_ANDAMENTO,
        OR: [{ prazoAprovacao: { lte: agora } }, { prazoPagamento: { lte: agora } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: limite,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async countPorStatus(): Promise<Record<string, number>> {
    const grupos = await this.prisma.sagaOS.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(grupos.map((g) => [g.status, g._count._all]));
  }

  private toDomain(r: any): SagaOS {
    return SagaOS.reconstitute({
      id: r.id,
      numero: r.numero,
      clienteId: r.clienteId,
      veiculoId: r.veiculoId,
      descricaoProblema: r.descricaoProblema,
      passo: r.passo as PassoSaga,
      status: r.status as StatusSaga,
      historico: (r.historico ?? []) as PassoHistorico[],
      compensacoes: (r.compensacoes ?? []) as Compensacao[],
      prazoAprovacao: r.prazoAprovacao ?? null,
      prazoPagamento: r.prazoPagamento ?? null,
      version: r.version ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }
}
