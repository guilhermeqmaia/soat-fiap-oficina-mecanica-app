import { Veiculo } from '../../domain/veiculo.entity';
import { PaginatedResult } from '../../application/gateways/veiculo.gateway';

/**
 * Presenter do Veiculo: traduz a ENTIDADE de dominio para o shape plano
 * de resposta HTTP. Concentra a formatacao que antes vivia inline (`toResponse`)
 * nos controllers, mantendo a camada de interface livre de logica de mapeamento.
 */
export class VeiculoPresenter {
  static toResponse(veiculo: Veiculo) {
    return {
      id: veiculo.id,
      placa: veiculo.placa.value,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      clienteId: veiculo.clienteId,
      ativo: veiculo.ativo,
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Veiculo>) {
    return {
      data: result.data.map((v) => VeiculoPresenter.toResponse(v)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  static toResponseList(veiculos: Veiculo[]) {
    return veiculos.map((v) => VeiculoPresenter.toResponse(v));
  }
}
