import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Notificacao } from '../../domain/notificacao.entity';
import { ClienteNotFoundError } from '../../../ordem-de-servico/domain/errors/cliente-not-found.error';
import {
  NOTIFICACAO_GATEWAY,
  NotificacaoGateway,
  PaginatedResult,
} from '../gateways/notificacao.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
} from '../gateways/cliente-consulta.gateway';

export interface ListarNotificacoesPorCpfCnpjInput {
  cpfCnpj: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListarNotificacoesPorCpfCnpjUseCase
  implements
    UseCase<ListarNotificacoesPorCpfCnpjInput, PaginatedResult<Notificacao>>
{
  constructor(
    @Inject(NOTIFICACAO_GATEWAY)
    private readonly gateway: NotificacaoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
  ) {}

  async execute(
    input: ListarNotificacoesPorCpfCnpjInput,
  ): Promise<PaginatedResult<Notificacao>> {
    // A posse (CPF do token == CPF consultado) e checada no controller a
    // partir da claim — resource server (US-F3-03). Aqui so resta o 404.
    const cliente = await this.clienteGateway.findByCpfCnpj(input.cpfCnpj);
    if (!cliente) {
      throw new ClienteNotFoundError(input.cpfCnpj);
    }
    return this.gateway.findAll({
      clienteId: cliente.id,
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    });
  }
}
