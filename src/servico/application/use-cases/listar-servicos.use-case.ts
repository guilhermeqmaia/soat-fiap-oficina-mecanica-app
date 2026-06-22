import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Servico } from '../../domain/servico.entity';
import {
  SERVICO_GATEWAY,
  ServicoGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/servico.gateway';

export type ListarServicosInput = FindAllParams;

@Injectable()
export class ListarServicosUseCase
  implements UseCase<ListarServicosInput, PaginatedResult<Servico>>
{
  constructor(
    @Inject(SERVICO_GATEWAY)
    private readonly gateway: ServicoGateway,
  ) {}

  execute(input: ListarServicosInput): Promise<PaginatedResult<Servico>> {
    return this.gateway.findAll(input);
  }
}
