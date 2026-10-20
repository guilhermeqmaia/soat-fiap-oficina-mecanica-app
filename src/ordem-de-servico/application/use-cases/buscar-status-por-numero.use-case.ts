import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { OsStatusView } from '../views/ordem-de-servico-views';

export interface BuscarStatusPorNumeroInput {
  numero: string;
}

/** Acompanhamento publico pelo numero (US-16): nomes vem do snapshot dos itens. */
@Injectable()
export class BuscarStatusPorNumeroUseCase implements UseCase<BuscarStatusPorNumeroInput, OsStatusView> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  async execute(input: BuscarStatusPorNumeroInput): Promise<OsStatusView> {
    const ordem = await this.gateway.findByNumero(input.numero);
    if (!ordem) throw new OrdemDeServicoNotFoundError(input.numero);

    const servicos = ordem.itensServico.map((i) => ({
      servicoId: i.servicoId,
      nome: i.nome,
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      subtotal: i.subtotalServico(),
      produtos: i.produtos.map((p) => ({
        produtoId: p.produtoId,
        nome: p.nome,
        quantidade: p.quantidade,
        precoUnitario: p.precoUnitario,
        subtotal: p.subtotal(),
      })),
    }));

    return {
      id: ordem.id!,
      numero: ordem.numero,
      status: ordem.status,
      motivoCancelamento: ordem.motivoCancelamento,
      descricaoInicial: ordem.descricaoInicial,
      diagnostico: ordem.diagnostico,
      servicos,
      valorTotalServicos: ordem.valorTotalServicos(),
      valorTotalProdutos: ordem.valorTotalProdutos(),
      valorTotal: ordem.valorTotal(),
      createdAt: ordem.createdAt,
      updatedAt: ordem.updatedAt,
    };
  }
}
