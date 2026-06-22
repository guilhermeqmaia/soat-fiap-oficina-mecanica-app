import { OrdemDeServicoPresenter } from './ordem-de-servico.presenter';

const item = {
  servicoId: 's1',
  quantidade: 1,
  precoUnitario: 50,
  statusExecucao: 'PENDENTE',
  inicioExecucao: null,
  fimExecucao: null,
  horasTrabalhadas: null,
  subtotalServico: () => 50,
  produtos: [
    { produtoId: 'p1', quantidade: 2, precoUnitario: 10, subtotal: () => 20 },
  ],
};

function fakeOs() {
  return {
    id: 'os-1',
    numero: 'OS-0001',
    clienteId: 'cli-1',
    veiculoId: 'vei-1',
    usuarioId: 'mec-1',
    descricaoInicial: 'desc',
    diagnostico: 'diag',
    status: 'EM_EXECUCAO',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    itensServico: [item],
    valorTotalServicos: () => 50,
    valorTotalProdutos: () => 20,
  } as any;
}

describe('OrdemDeServicoPresenter', () => {
  it('flattens an OS entity into the response shape', () => {
    const res = OrdemDeServicoPresenter.toResponse(fakeOs());
    expect(res.id).toBe('os-1');
    expect(res.valorTotalServicos).toBe(50);
    expect(res.valorTotalProdutos).toBe(20);
    expect(res.itensServico[0].subtotal).toBe(50);
    expect(res.itensServico[0].produtos[0].subtotal).toBe(20);
  });

  it('maps a paginated result', () => {
    const res = OrdemDeServicoPresenter.toPaginatedResponse({
      data: [fakeOs()],
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(res.total).toBe(1);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].numero).toBe('OS-0001');
  });
});
