import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Notificacao } from '../domain/notificacao.entity';
import {
  FindAllParams,
  NotificacaoRepository,
  PaginatedResult,
} from '../domain/notificacao.repository';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';
import { StatusNotificacao } from '../domain/value-objects/status-notificacao.vo';
import { TipoNotificacao } from '../domain/value-objects/tipo-notificacao.vo';

interface NotificacaoRecord {
  id: string;
  clienteId: string;
  ordemDeServicoId: string | null;
  tipo: string;
  canal: string;
  destinatario: string;
  assunto: string;
  mensagem: string;
  status: string;
  erro: string | null;
  enviadaEm: Date | null;
  createdAt: Date;
}

@Injectable()
export class PrismaNotificacaoRepository implements NotificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(notificacao: Notificacao): Promise<Notificacao> {
    const record = await this.prisma.notificacao.create({
      data: {
        clienteId: notificacao.clienteId,
        ordemDeServicoId: notificacao.ordemDeServicoId,
        tipo: notificacao.tipo,
        canal: notificacao.canal,
        destinatario: notificacao.destinatario,
        assunto: notificacao.assunto,
        mensagem: notificacao.mensagem,
        status: notificacao.status,
        erro: notificacao.erro,
        enviadaEm: notificacao.enviadaEm,
      },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<Notificacao | null> {
    const record = await this.prisma.notificacao.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Notificacao>> {
    const { page, limit, clienteId, ordemDeServicoId } = params;
    const skip = (page - 1) * limit;
    const where = {
      ...(clienteId ? { clienteId } : {}),
      ...(ordemDeServicoId ? { ordemDeServicoId } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.notificacao.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificacao.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  private toDomain(record: NotificacaoRecord): Notificacao {
    return Notificacao.reconstitute({
      id: record.id,
      clienteId: record.clienteId,
      ordemDeServicoId: record.ordemDeServicoId,
      tipo: record.tipo as TipoNotificacao,
      canal: record.canal as CanalNotificacao,
      destinatario: record.destinatario,
      assunto: record.assunto,
      mensagem: record.mensagem,
      status: record.status as StatusNotificacao,
      erro: record.erro,
      enviadaEm: record.enviadaEm,
      createdAt: record.createdAt,
    });
  }
}
