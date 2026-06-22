import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { CLIENTE_GATEWAY, ClienteGateway } from '../gateways/cliente.gateway';

export interface DeletarClienteInput {
  id: string;
}

@Injectable()
export class DeletarClienteUseCase
  implements UseCase<DeletarClienteInput, void>
{
  constructor(
    @Inject(CLIENTE_GATEWAY)
    private readonly gateway: ClienteGateway,
  ) {}

  async execute(input: DeletarClienteInput): Promise<void> {
    const cliente = await this.gateway.findById(input.id);
    if (!cliente) {
      throw new ClienteNotFoundError(input.id);
    }
    await this.gateway.delete(input.id);
  }
}
