import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { PaginatedResult } from '../../application/gateways/ordem-de-servico.gateway';

/** Traduz a entidade para o shape plano de resposta HTTP. */
export class OrdemDeServicoPresenter {
  static toResponse(os: OrdemDeServico) {
    return {
      id: os.id,
      numero: os.numero,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      mecanicoId: os.mecanicoId,
      descricaoInicial: os.descricaoInicial,
      diagnostico: os.diagnostico,
      status: os.status,
      motivoCancelamento: os.motivoCancelamento,
      itensServico: os.itensServico.map((i) => ({
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
      })),
      valorTotalServicos: os.valorTotalServicos(),
      valorTotalProdutos: os.valorTotalProdutos(),
      valorTotal: os.valorTotal(),
      createdAt: os.createdAt,
      updatedAt: os.updatedAt,
    };
  }

  static toPaginatedResponse(result: PaginatedResult<OrdemDeServico>) {
    return {
      data: result.data.map((os) => OrdemDeServicoPresenter.toResponse(os)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
