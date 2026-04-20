import { OrdemDeServico } from './ordem-de-servico.entity';
import { StatusOS } from './value-objects/status-os.vo';
import { InvalidStatusTransitionError } from './errors/invalid-status-transition.error';
import { ProdutoDuplicadoNaOSError } from './errors/produto-duplicado-na-os.error';
import { ProdutoInexistenteNaOSError } from './errors/produto-inexistente-na-os.error';

const now = new Date();

const criarOS = (status: StatusOS = StatusOS.EM_DIAGNOSTICO) =>
  OrdemDeServico.reconstitute({
    id: 'os-1',
    numero: 'OS-2026-00001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    usuarioId: 'usr-1',
    descricaoInicial: 'Ruido no motor',
    diagnostico: null,
    status,
    createdAt: now,
    updatedAt: now,
  });

describe('OrdemDeServico.adicionarProduto (US-10)', () => {
  it('adiciona produto quando status e EM_DIAGNOSTICO', () => {
    const os = criarOS();

    const item = os.adicionarProduto({
      produtoId: 'p1',
      nomeProduto: 'Filtro de Oleo',
      quantidade: 2,
      valorUnitario: 30,
    });

    expect(os.itensProduto).toHaveLength(1);
    expect(item.valorTotal).toBe(60);
    expect(os.valorTotalProdutos).toBe(60);
  });

  it('lanca InvalidStatusTransitionError se OS nao estiver em EM_DIAGNOSTICO', () => {
    const os = criarOS(StatusOS.RECEBIDA);

    expect(() =>
      os.adicionarProduto({
        produtoId: 'p1',
        nomeProduto: 'Filtro',
        quantidade: 1,
        valorUnitario: 30,
      }),
    ).toThrow(InvalidStatusTransitionError);
  });

  it('lanca ProdutoDuplicadoNaOSError ao adicionar mesmo produtoId duas vezes', () => {
    const os = criarOS();
    os.adicionarProduto({
      produtoId: 'p1',
      nomeProduto: 'Filtro',
      quantidade: 1,
      valorUnitario: 30,
    });

    expect(() =>
      os.adicionarProduto({
        produtoId: 'p1',
        nomeProduto: 'Filtro',
        quantidade: 3,
        valorUnitario: 30,
      }),
    ).toThrow(ProdutoDuplicadoNaOSError);
  });

  it('rejeita quantidade zero ou negativa', () => {
    const os = criarOS();

    expect(() =>
      os.adicionarProduto({
        produtoId: 'p1',
        nomeProduto: 'Filtro',
        quantidade: 0,
        valorUnitario: 30,
      }),
    ).toThrow('quantidade deve ser um inteiro maior que zero');
  });
});

describe('OrdemDeServico.removerProduto (US-10)', () => {
  const criarOSComItem = (status: StatusOS = StatusOS.EM_DIAGNOSTICO) =>
    OrdemDeServico.reconstitute({
      id: 'os-1',
      numero: 'OS-2026-00001',
      clienteId: 'cliente-1',
      veiculoId: 'veiculo-1',
      usuarioId: 'usr-1',
      descricaoInicial: 'Ruido no motor',
      diagnostico: null,
      status,
      createdAt: now,
      updatedAt: now,
      itensProduto: [
        {
          produtoId: 'p1',
          nomeProduto: 'Filtro',
          quantidade: 2,
          valorUnitario: 30,
        },
      ],
    });

  it('remove o produto e zera valorTotalProdutos', () => {
    const os = criarOSComItem();

    const removido = os.removerProduto('p1');

    expect(os.itensProduto).toHaveLength(0);
    expect(removido.produtoId).toBe('p1');
    expect(removido.quantidade).toBe(2);
    expect(os.valorTotalProdutos).toBe(0);
  });

  it('lanca ProdutoInexistenteNaOSError ao remover produto ausente', () => {
    const os = criarOSComItem();

    expect(() => os.removerProduto('nao-existe')).toThrow(
      ProdutoInexistenteNaOSError,
    );
  });

  it('lanca InvalidStatusTransitionError se OS nao estiver em EM_DIAGNOSTICO', () => {
    const os = criarOSComItem(StatusOS.EM_EXECUCAO);

    expect(() => os.removerProduto('p1')).toThrow(InvalidStatusTransitionError);
  });
});

describe('OrdemDeServico.valorTotalProdutos (US-10)', () => {
  it('soma o valor total de todos os itens', () => {
    const os = OrdemDeServico.reconstitute({
      id: 'os-1',
      numero: 'OS-2026-00001',
      clienteId: 'cliente-1',
      veiculoId: 'veiculo-1',
      usuarioId: null,
      descricaoInicial: 'Diagnostico',
      diagnostico: null,
      status: StatusOS.EM_DIAGNOSTICO,
      createdAt: now,
      updatedAt: now,
      itensProduto: [
        { produtoId: 'p1', nomeProduto: 'Filtro', quantidade: 2, valorUnitario: 30 },
        { produtoId: 'p2', nomeProduto: 'Pastilha', quantidade: 1, valorUnitario: 120 },
      ],
    });

    expect(os.valorTotalProdutos).toBe(180);
  });
});
