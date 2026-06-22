import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { PaginatedResult } from '../../application/gateways/ordem-de-servico.gateway';

/**
 * Presenter da OrdemDeServico: traduz a ENTIDADE de dominio para o shape plano
 * de resposta HTTP. Concentra a formatacao que antes vivia inline (`toResponse`)
 * nos controllers, mantendo a camada de interface livre de logica de mapeamento.
 */
export class OrdemDeServicoPresenter {
  static toResponse(os: OrdemDeServico) {
    return {
      id: os.id,
      numero: os.numero,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      usuarioId: os.usuarioId,
      descricaoInicial: os.descricaoInicial,
      diagnostico: os.diagnostico,
      status: os.status,
      itensServico: os.itensServico.map((i) => ({
        servicoId: i.servicoId,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        subtotal: i.subtotalServico(),
        statusExecucao: i.statusExecucao,
        inicioExecucao: i.inicioExecucao,
        fimExecucao: i.fimExecucao,
        horasTrabalhadas: i.horasTrabalhadas,
        produtos: i.produtos.map((p) => ({
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          precoUnitario: p.precoUnitario,
          subtotal: p.subtotal(),
        })),
      })),
      valorTotalServicos: os.valorTotalServicos(),
      valorTotalProdutos: os.valorTotalProdutos(),
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
