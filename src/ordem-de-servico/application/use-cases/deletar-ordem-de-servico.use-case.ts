import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface DeletarOrdemDeServicoInput {
  id: string;
}

/**
 * Exclusao administrativa. Reservas de estoque nao existem mais aqui (sao do
 * Execucao Service e sao liberadas pela compensacao da saga ao cancelar).
 */
@Injectable()
export class DeletarOrdemDeServicoUseCase implements UseCase<DeletarOrdemDeServicoInput, void> {
  constructor(@Inject(ORDEM_DE_SERVICO_GATEWAY) private readonly gateway: OrdemDeServicoGateway) {}

  async execute(input: DeletarOrdemDeServicoInput): Promise<void> {
    await carregarOrdemOuFalhar(this.gateway, input.id);
    await this.gateway.delete(input.id);
  }
}
