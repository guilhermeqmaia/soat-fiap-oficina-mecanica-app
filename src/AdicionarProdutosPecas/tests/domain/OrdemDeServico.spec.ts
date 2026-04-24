import { OrdemDeServico } from '../../src/domain/ordemDeServico/entities/OrdemDeServico';
import { StatusOrdemDeServico } from '../../src/domain/ordemDeServico/valueObjects/StatusOrdemDeServico';

const criarOS = (status = StatusOrdemDeServico.EM_DIAGNOSTICO) =>
  new OrdemDeServico({ id: 'os-001', status, mecanicoId: 'mec-01', veiculoId: 'vei-01' });

describe('OrdemDeServico — adicionarProduto', () => {
  it('deve adicionar um produto quando status é EM_DIAGNOSTICO', () => {
    const os = criarOS();
    const item = os.adicionarProduto({ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 2, valorUnitario: 30 });

    expect(os.itens).toHaveLength(1);
    expect(item.valorTotal).toBe(60);
  });

  it('deve emitir evento ProdutoAdicionadoNaOS', () => {
    const os = criarOS();
    os.adicionarProduto({ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 1, valorUnitario: 30 });
    const events = os.pullEvents();

    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('ProdutoAdicionadoNaOS');
  });

  it('deve lançar erro se status não for EM_DIAGNOSTICO', () => {
    const os = criarOS(StatusOrdemDeServico.EM_EXECUCAO);

    expect(() =>
      os.adicionarProduto({ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 1, valorUnitario: 30 })
    ).toThrow('EM_DIAGNOSTICO');
  });

  it('deve lançar erro ao adicionar produto já existente na OS', () => {
    const os = criarOS();
    os.adicionarProduto({ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 1, valorUnitario: 30 });

    expect(() =>
      os.adicionarProduto({ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 1, valorUnitario: 30 })
    ).toThrow('já está na OS');
  });
});

describe('OrdemDeServico — removerProduto', () => {
  const criarOSComItem = () => {
    const os = new OrdemDeServico({
      id: 'os-001',
      status: StatusOrdemDeServico.EM_DIAGNOSTICO,
      mecanicoId: 'mec-01',
      veiculoId: 'vei-01',
      itens: [{ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 2, valorUnitario: 30 }],
    });
    return os;
  };

  it('deve remover o produto e emitir ProdutoRemovidoDaOS', () => {
    const os = criarOSComItem();
    os.removerProduto('p1');
    const events = os.pullEvents();

    expect(os.itens).toHaveLength(0);
    expect(events[0].eventName).toBe('ProdutoRemovidoDaOS');
    expect(events[0].quantidade).toBe(2);
  });

  it('deve lançar erro ao remover produto inexistente', () => {
    const os = criarOSComItem();
    expect(() => os.removerProduto('nao-existe')).toThrow('não encontrado na OS');
  });

  it('deve lançar erro se status não for EM_DIAGNOSTICO', () => {
    const os = new OrdemDeServico({
      id: 'os-001',
      status: StatusOrdemDeServico.CONCLUIDA,
      mecanicoId: 'mec-01',
      veiculoId: 'vei-01',
      itens: [{ produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 1, valorUnitario: 30 }],
    });
    expect(() => os.removerProduto('p1')).toThrow('EM_DIAGNOSTICO');
  });
});
