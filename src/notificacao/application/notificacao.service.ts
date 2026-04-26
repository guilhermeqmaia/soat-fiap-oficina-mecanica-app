import { Inject, Injectable, Logger } from '@nestjs/common';
import { Notificacao } from '../domain/notificacao.entity';
import {
  FindAllParams,
  NOTIFICACAO_REPOSITORY,
  NotificacaoRepository,
  PaginatedResult,
} from '../domain/notificacao.repository';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';
import { TipoNotificacao } from '../domain/value-objects/tipo-notificacao.vo';
import { NOTIFICADOR, Notificador } from './ports/notificador.port';

export interface EnviarNotificacaoInput {
  clienteId: string;
  ordemDeServicoId?: string;
  tipo: TipoNotificacao;
  canal: CanalNotificacao;
  destinatario: string;
  assunto: string;
  mensagem: string;
}

@Injectable()
export class NotificacaoService {
  private readonly logger = new Logger(NotificacaoService.name);
  private readonly notificadoresPorCanal: Map<CanalNotificacao, Notificador>;

  constructor(
    @Inject(NOTIFICACAO_REPOSITORY)
    private readonly repository: NotificacaoRepository,
    @Inject(NOTIFICADOR)
    notificadores: Notificador[],
  ) {
    this.notificadoresPorCanal = new Map(
      notificadores.map((n) => [n.canal, n]),
    );
    if (this.notificadoresPorCanal.size !== notificadores.length) {
      const canais = notificadores.map((n) => n.canal);
      throw new Error(
        `Notificadores duplicados para o mesmo canal: ${canais.join(', ')}`,
      );
    }
  }

  async enviar(input: EnviarNotificacaoInput): Promise<Notificacao> {
    const notificacao = Notificacao.create({
      clienteId: input.clienteId,
      ordemDeServicoId: input.ordemDeServicoId,
      tipo: input.tipo,
      canal: input.canal,
      destinatario: input.destinatario,
      assunto: input.assunto,
      mensagem: input.mensagem,
    });

    const notificador = this.notificadoresPorCanal.get(input.canal);
    if (!notificador) {
      notificacao.marcarComoFalha(
        `Nenhum notificador registrado para o canal ${input.canal}`,
      );
      return this.repository.create(notificacao);
    }

    try {
      await notificador.enviar({
        destinatario: input.destinatario,
        assunto: input.assunto,
        corpo: input.mensagem,
      });
      notificacao.marcarComoEnviada();
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao enviar notificacao tipo=${input.tipo} canal=${input.canal}: ${motivo}`,
      );
      notificacao.marcarComoFalha(motivo);
    }

    return this.repository.create(notificacao);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Notificacao>> {
    return this.repository.findAll(params);
  }
}
