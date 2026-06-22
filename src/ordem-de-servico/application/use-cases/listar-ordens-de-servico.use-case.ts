import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  FindAllParams,
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
  PaginatedResult,
} from '../gateways/ordem-de-servico.gateway';

export type ListarOrdensDeServicoInput = FindAllParams;

@Injectable()
export class ListarOrdensDeServicoUseCase
  implements
    UseCase<ListarOrdensDeServicoInput, PaginatedResult<OrdemDeServico>>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  execute(
    input: ListarOrdensDeServicoInput,
  ): Promise<PaginatedResult<OrdemDeServico>> {
    return this.gateway.findAll(input);
  }
}
