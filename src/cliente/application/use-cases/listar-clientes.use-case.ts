import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Cliente } from '../../domain/cliente.entity';
import {
  CLIENTE_GATEWAY,
  ClienteGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/cliente.gateway';

export type ListarClientesInput = FindAllParams;

@Injectable()
export class ListarClientesUseCase
  implements UseCase<ListarClientesInput, PaginatedResult<Cliente>>
{
  constructor(
    @Inject(CLIENTE_GATEWAY)
    private readonly gateway: ClienteGateway,
  ) {}

  execute(input: ListarClientesInput): Promise<PaginatedResult<Cliente>> {
    return this.gateway.findAll(input);
  }
}
