import { OrdemDeServicoPresenter } from './ordem-de-servico.presenter';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../domain/value-objects/status-os.vo';
import { ItemServicoOS } from '../../domain/value-objects/item-servico-os.vo';
import { ItemProdutoOS } from '../../domain/value-objects/item-produto-os.vo';

describe('OrdemDeServicoPresenter', () => {
  const os = OrdemDeServico.reconstitute({
    id: 'id-1', numero: 'OS-2026-1', clienteId: 'c', veiculoId: 'v', mecanicoId: 'm', descricaoInicial: 'Barulho', diagnostico: 'd', status: StatusOS.AGUARDANDO_APROVACAO,
    motivoCancelamento: null, createdAt: new Date(), updatedAt: new Date(), itensServico: [new ItemServicoOS('s1', 'Troca', 1, 200, [new ItemProdutoOS('p1', 'Pastilha', 2, 50)])],
  });
  it('achata a entidade com snapshot (nome) e totais', () => {
    const r = OrdemDeServicoPresenter.toResponse(os);
    expect(r).toMatchObject({ id: 'id-1', mecanicoId: 'm', status: 'AGUARDANDO_APROVACAO', motivoCancelamento: null, valorTotalServicos: 200, valorTotalProdutos: 100, valorTotal: 300 });
    expect(r.itensServico[0]).toMatchObject({ nome: 'Troca', subtotal: 200, produtos: [{ nome: 'Pastilha', subtotal: 100 }] });
  });
  it('pagina preservando metadados', () => {
    const r = OrdemDeServicoPresenter.toPaginatedResponse({ data: [os], total: 1, page: 2, limit: 5 });
    expect(r).toMatchObject({ total: 1, page: 2, limit: 5 }); expect(r.data).toHaveLength(1);
  });
});
