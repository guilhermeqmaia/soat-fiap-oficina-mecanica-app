import { Injectable, Logger } from '@nestjs/common';
import { MessageEnvelope, MessageHandler } from '@guilhermeqmaia/oficina-kit/messaging';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';
import {
  RegistrarCancelamentoUseCase,
  RegistrarDiagnosticoUseCase,
  RegistrarEnfileiramentoUseCase,
  RegistrarExecucaoFinalizadaUseCase,
  RegistrarExecucaoIniciadaUseCase,
  RegistrarOrcamentoAprovadoUseCase,
  RegistrarOrcamentoGeradoUseCase,
} from '../../application/use-cases/transicoes';
import { ItemDiagnosticoInput } from '../../application/use-cases/transicoes/registrar-diagnostico.use-case';

/**
 * Handlers da fila `os-eventos.fifo` (AsyncAPI: canais `oficina-execucao` e
 * `oficina-billing`). Cada um traduz o payload do contrato para o use case de
 * transicao correspondente. Idempotencia: o SqsConsumer do kit descarta ids ja
 * processados; os use cases tratam reentrega como no-op e evento incompativel
 * como erro (retry -> DLQ, RFC-0006).
 */
type NumeroOS = { numeroOS: string };

@Injectable()
export class ExecucaoEnfileiradaHandler implements MessageHandler<NumeroOS & { posicaoFila: number }> {
  readonly type = 'execucao.enfileirada';
  constructor(private readonly useCase: RegistrarEnfileiramentoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS & { posicaoFila: number }>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS });
  }
}

@Injectable()
export class ExecucaoRecusadaHandler implements MessageHandler<NumeroOS & { motivo: string }> {
  readonly type = 'execucao.recusada';
  constructor(private readonly useCase: RegistrarCancelamentoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS & { motivo: string }>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS, motivo: MotivoCancelamento.EXECUCAO_RECUSADA });
  }
}

export interface DiagnosticoConcluidoData extends NumeroOS {
  mecanicoId: string;
  diagnostico: string;
  itens: ItemDiagnosticoInput[];
}

@Injectable()
export class ExecucaoDiagnosticoConcluidoHandler implements MessageHandler<DiagnosticoConcluidoData> {
  readonly type = 'execucao.diagnostico-concluido';
  constructor(private readonly useCase: RegistrarDiagnosticoUseCase) {}
  async handle(envelope: MessageEnvelope<DiagnosticoConcluidoData>): Promise<void> {
    const { numeroOS, mecanicoId, diagnostico, itens } = envelope.data;
    await this.useCase.execute({ numero: numeroOS, mecanicoId, diagnostico, itens });
  }
}

@Injectable()
export class ExecucaoIniciadaHandler implements MessageHandler<NumeroOS> {
  readonly type = 'execucao.iniciada';
  constructor(private readonly useCase: RegistrarExecucaoIniciadaUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS });
  }
}

@Injectable()
export class ExecucaoFinalizadaHandler implements MessageHandler<NumeroOS & { finalizadaEm: string }> {
  readonly type = 'execucao.finalizada';
  constructor(private readonly useCase: RegistrarExecucaoFinalizadaUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS & { finalizadaEm: string }>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS });
  }
}

@Injectable()
export class BillingOrcamentoGeradoHandler implements MessageHandler<NumeroOS & { orcamentoId: string; total: string }> {
  readonly type = 'billing.orcamento-gerado';
  constructor(private readonly useCase: RegistrarOrcamentoGeradoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS & { orcamentoId: string; total: string }>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS, total: envelope.data.total });
  }
}

@Injectable()
export class BillingOrcamentoAprovadoHandler implements MessageHandler<NumeroOS & { linkPagamento: string }> {
  readonly type = 'billing.orcamento-aprovado';
  constructor(private readonly useCase: RegistrarOrcamentoAprovadoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS & { linkPagamento: string }>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS });
  }
}

@Injectable()
export class BillingOrcamentoRejeitadoHandler implements MessageHandler<NumeroOS> {
  readonly type = 'billing.orcamento-rejeitado';
  constructor(private readonly useCase: RegistrarCancelamentoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS, motivo: MotivoCancelamento.ORCAMENTO_REJEITADO });
  }
}

@Injectable()
export class BillingPagamentoRecusadoHandler implements MessageHandler<NumeroOS> {
  readonly type = 'billing.pagamento-recusado';
  constructor(private readonly useCase: RegistrarCancelamentoUseCase) {}
  async handle(envelope: MessageEnvelope<NumeroOS>): Promise<void> {
    await this.useCase.execute({ numero: envelope.data.numeroOS, motivo: MotivoCancelamento.PAGAMENTO_RECUSADO });
  }
}

/**
 * Eventos que a fila recebe (filter policy do infra-k8s) mas que nao mudam o
 * status da OS: sao insumo do orquestrador (US-F4-10) e das compensacoes
 * (US-F4-11). Ate la, registram no log e sao confirmados — nao podem ir para a
 * DLQ por "sem handler".
 */
abstract class RegistrarSemTransicaoHandler implements MessageHandler<NumeroOS> {
  private readonly logger = new Logger(RegistrarSemTransicaoHandler.name);
  abstract readonly type: string;
  async handle(envelope: MessageEnvelope<NumeroOS>): Promise<void> {
    this.logger.log({ msg: 'evento recebido sem transicao de status (orquestrador US-F4-10)', type: this.type, numeroOS: envelope.data.numeroOS });
  }
}

@Injectable()
export class BillingPagamentoAprovadoHandler extends RegistrarSemTransicaoHandler {
  readonly type = 'billing.pagamento-aprovado';
}

@Injectable()
export class BillingOrcamentoCanceladoHandler extends RegistrarSemTransicaoHandler {
  readonly type = 'billing.orcamento-cancelado';
}

@Injectable()
export class ExecucaoReservasLiberadasHandler extends RegistrarSemTransicaoHandler {
  readonly type = 'execucao.reservas-liberadas';
}
