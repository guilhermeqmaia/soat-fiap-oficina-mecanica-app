import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';
import { OrquestradorSagaService } from '../../saga/application/orquestrador-saga.service';

export interface CancelarOrdemDeServicoInput {
  id: string;
  motivo?: MotivoCancelamento;
}

/**
 * Cancelamento manual pelo atendente (motivo OPERADOR por default). Passa pelo
 * orquestrador: a saga decide as compensacoes pelo passo atual (cancelar
 * orcamento/estornar no Billing, liberar reservas na Execucao) e cancela a OS.
 */
@Injectable()
export class CancelarOrdemDeServicoUseCase implements UseCase<CancelarOrdemDeServicoInput, OrdemDeServico> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    private readonly orquestrador: OrquestradorSagaService,
  ) {}

  async execute(input: CancelarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    // A OS valida o status (so antes da execucao comecar) antes de a saga agir.
    ordem.cancelar(input.motivo ?? MotivoCancelamento.OPERADOR);
    await this.orquestrador.processar({
      type: 'os.cancelamento-manual',
      data: { numeroOS: ordem.numero, motivo: input.motivo ?? MotivoCancelamento.OPERADOR },
    });
    return carregarOrdemOuFalhar(this.gateway, input.id);
  }
}
