import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Cliente, UpdateClienteProps } from '../../domain/cliente.entity';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { CLIENTE_GATEWAY, ClienteGateway } from '../gateways/cliente.gateway';

export interface AtualizarClienteInput {
  id: string;
  props: UpdateClienteProps;
}

@Injectable()
export class AtualizarClienteUseCase
  implements UseCase<AtualizarClienteInput, Cliente>
{
  constructor(
    @Inject(CLIENTE_GATEWAY)
    private readonly gateway: ClienteGateway,
  ) {}

  async execute(input: AtualizarClienteInput): Promise<Cliente> {
    const cliente = await this.gateway.findById(input.id);
    if (!cliente) {
      throw new ClienteNotFoundError(input.id);
    }

    cliente.update(input.props);
    return this.gateway.update(cliente);
  }
}
