import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Cliente } from '../../domain/cliente.entity';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { CLIENTE_GATEWAY, ClienteGateway } from '../gateways/cliente.gateway';

export interface BuscarClientePorIdInput {
  id: string;
}

@Injectable()
export class BuscarClientePorIdUseCase
  implements UseCase<BuscarClientePorIdInput, Cliente>
{
  constructor(
    @Inject(CLIENTE_GATEWAY)
    private readonly gateway: ClienteGateway,
  ) {}

  async execute(input: BuscarClientePorIdInput): Promise<Cliente> {
    const cliente = await this.gateway.findById(input.id);
    if (!cliente) {
      throw new ClienteNotFoundError(input.id);
    }
    return cliente;
  }
}
