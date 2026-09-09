import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
  PaginatedResult,
} from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
} from '../gateways/consulta.gateways';
import { OsHistoryItem } from '../views/ordem-de-servico-views';

export interface ListarHistoricoPorCpfCnpjInput {
  cpfCnpj: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListarHistoricoPorCpfCnpjUseCase
  implements
    UseCase<ListarHistoricoPorCpfCnpjInput, PaginatedResult<OsHistoryItem>>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
  ) {}

  async execute(
    input: ListarHistoricoPorCpfCnpjInput,
  ): Promise<PaginatedResult<OsHistoryItem>> {
    // A posse (CPF do token == CPF consultado) e checada no controller a
    // partir da claim — resource server (US-F3-03). Aqui so resta o 404.
    const cliente = await this.clienteGateway.findByCpfCnpj(input.cpfCnpj);
    if (!cliente) {
      throw new ClienteNotFoundError(input.cpfCnpj);
    }

    const result = await this.gateway.findAll({
      clienteId: cliente.id,
      page: input.page ?? 1,
      limit: input.limit ?? 10,
    });

    return {
      data: result.data.map((os) => ({
        numero: os.numero,
        status: os.status,
        descricaoInicial: os.descricaoInicial,
        createdAt: os.createdAt,
        updatedAt: os.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
