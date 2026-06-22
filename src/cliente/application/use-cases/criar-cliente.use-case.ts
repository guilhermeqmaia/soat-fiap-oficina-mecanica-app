import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Cliente } from '../../domain/cliente.entity';
import { DuplicateCpfCnpjError } from '../../domain/errors/duplicate-cpf-cnpj.error';
import { CLIENTE_GATEWAY, ClienteGateway } from '../gateways/cliente.gateway';

export interface CriarClienteInput {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email?: string;
}

@Injectable()
export class CriarClienteUseCase implements UseCase<CriarClienteInput, Cliente> {
  constructor(
    @Inject(CLIENTE_GATEWAY)
    private readonly gateway: ClienteGateway,
  ) {}

  async execute(input: CriarClienteInput): Promise<Cliente> {
    const cpfCnpjClean = input.cpfCnpj.replace(/\D/g, '');
    const exists = await this.gateway.existsByCpfCnpj(cpfCnpjClean);
    if (exists) {
      throw new DuplicateCpfCnpjError(input.cpfCnpj);
    }

    const cliente = Cliente.create(input);
    return this.gateway.create(cliente);
  }
}
