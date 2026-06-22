import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Notificacao } from '../../domain/notificacao.entity';
import { CanalNotificacao } from '../../domain/value-objects/canal-notificacao.vo';
import { TipoNotificacao } from '../../domain/value-objects/tipo-notificacao.vo';
import { NOTIFICADOR, Notificador } from '../ports/notificador.port';
import {
  NOTIFICACAO_GATEWAY,
  NotificacaoGateway,
} from '../gateways/notificacao.gateway';

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
export class EnviarNotificacaoUseCase
  implements UseCase<EnviarNotificacaoInput, Notificacao>
{
  private readonly logger = new Logger(EnviarNotificacaoUseCase.name);
  private readonly notificadoresPorCanal: Map<CanalNotificacao, Notificador>;

  constructor(
    @Inject(NOTIFICACAO_GATEWAY)
    private readonly gateway: NotificacaoGateway,
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

  async execute(input: EnviarNotificacaoInput): Promise<Notificacao> {
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
      return this.gateway.create(notificacao);
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

    return this.gateway.create(notificacao);
  }
}
