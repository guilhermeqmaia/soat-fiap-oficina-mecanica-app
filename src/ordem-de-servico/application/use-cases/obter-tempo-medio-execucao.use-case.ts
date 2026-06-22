import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
  TempoMedioExecucaoResult,
  TempoMedioFilters,
} from '../gateways/ordem-de-servico.gateway';

export type ObterTempoMedioExecucaoInput = TempoMedioFilters;

@Injectable()
export class ObterTempoMedioExecucaoUseCase
  implements
    UseCase<ObterTempoMedioExecucaoInput, TempoMedioExecucaoResult>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  execute(
    input: ObterTempoMedioExecucaoInput,
  ): Promise<TempoMedioExecucaoResult> {
    return this.gateway.getTempoMedioExecucao(input);
  }
}
