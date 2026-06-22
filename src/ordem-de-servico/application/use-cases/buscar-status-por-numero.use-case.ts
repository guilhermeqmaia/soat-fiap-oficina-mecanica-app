import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  PRODUTO_CONSULTA_GATEWAY,
  ProdutoConsultaGateway,
  SERVICO_CONSULTA_GATEWAY,
  ServicoConsultaGateway,
} from '../gateways/consulta.gateways';
import { OsStatusView } from '../views/ordem-de-servico-views';
import {
  carregarNomesProdutos,
  carregarNomesServicos,
} from './carregar-nomes-catalogo';

export interface BuscarStatusPorNumeroInput {
  numero: string;
}

@Injectable()
export class BuscarStatusPorNumeroUseCase
  implements UseCase<BuscarStatusPorNumeroInput, OsStatusView>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(SERVICO_CONSULTA_GATEWAY)
    private readonly servicoGateway: ServicoConsultaGateway,
    @Inject(PRODUTO_CONSULTA_GATEWAY)
    private readonly produtoGateway: ProdutoConsultaGateway,
  ) {}

  async execute(input: BuscarStatusPorNumeroInput): Promise<OsStatusView> {
    const ordem = await this.gateway.findByNumero(input.numero);
    if (!ordem) {
      throw new OrdemDeServicoNotFoundError(input.numero);
    }

    const servicoIds = ordem.itensServico.map((i) => i.servicoId);
    const produtoIds = ordem.itensServico.flatMap((i) =>
      i.produtos.map((p) => p.produtoId),
    );
    const [servicoNomeById, produtoNomeById] = await Promise.all([
      carregarNomesServicos(this.servicoGateway, servicoIds),
      carregarNomesProdutos(this.produtoGateway, produtoIds),
    ]);

    const servicos = ordem.itensServico.map((i) => ({
      servicoId: i.servicoId,
      nome: servicoNomeById.get(i.servicoId) ?? 'Servico removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      subtotal: i.subtotalServico(),
      produtos: i.produtos.map((p) => ({
        produtoId: p.produtoId,
        nome:
          produtoNomeById.get(p.produtoId) ?? 'Produto removido do catalogo',
        quantidade: p.quantidade,
        precoUnitario: p.precoUnitario,
        subtotal: p.subtotal(),
      })),
    }));

    const valorTotalServicos = ordem.valorTotalServicos();
    const valorTotalProdutos = ordem.valorTotalProdutos();

    return {
      id: ordem.id!,
      numero: ordem.numero,
      status: ordem.status,
      descricaoInicial: ordem.descricaoInicial,
      diagnostico: ordem.diagnostico,
      servicos,
      valorTotalServicos,
      valorTotalProdutos,
      valorTotal: valorTotalServicos + valorTotalProdutos,
      createdAt: ordem.createdAt,
      updatedAt: ordem.updatedAt,
    };
  }
}
