import { Produto } from '../../domain/produto.entity';
import { ProdutoNotFoundError } from '../../domain/errors/produto-not-found.error';
import { InsufficientStockError } from '../../domain/errors/insufficient-stock.error';
import { EstoqueBaixoEvent } from '../../domain/events/estoque-baixo.event';
import { AdicionarEstoqueUseCase } from './adicionar-estoque.use-case';
import { RemoverEstoqueUseCase } from './remover-estoque.use-case';
import { ReservarEstoqueUseCase } from './reservar-estoque.use-case';
import { LiberarEstoqueUseCase } from './liberar-estoque.use-case';
import { BaixarEstoqueUseCase } from './baixar-estoque.use-case';
import { ListarMovimentacoesUseCase } from './listar-movimentacoes.use-case';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';

function fakeProduto(
  quantidadeEstoque: number,
  estoqueMinimo: number,
  quantidadeReservada = 0,
) {
  return Produto.reconstitute({
    id: 'prod-1',
    nome: 'Filtro de oleo',
    descricao: null,
    precoUnitario: 29.9,
    quantidadeEstoque,
    quantidadeReservada,
    estoqueMinimo,
    ativo: true,
  });
}

/**
 * Mock do UnitOfWork: reproduz o contrato real — lê o produto (via factory),
 * aplica a operação de domínio (que pode lançar as invariantes) e devolve o
 * agregado mutado. A atomicidade/trava é validada no teste de integração.
 */
function makeUow(produtoFactory: () => Produto = () => fakeProduto(20, 5)) {
  return {
    mutarComMovimentacao: jest.fn(async ({ aplicar }: any) => {
      const produto = produtoFactory();
      aplicar(produto);
      return produto;
    }),
  };
}

function makeUowNotFound() {
  return {
    mutarComMovimentacao: jest
      .fn()
      .mockRejectedValue(new ProdutoNotFoundError('nope')),
  };
}

function makeEvents() {
  return { publish: jest.fn() };
}

function callArg(uow: any) {
  return uow.mutarComMovimentacao.mock.calls[0][0];
}

// ---------------------------------------------------------------------------
// AdicionarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('AdicionarEstoqueUseCase', () => {
  it('adds stock and records an ENTRADA movimentacao', async () => {
    const uow = makeUow(() => fakeProduto(20, 5));
    const useCase = new AdicionarEstoqueUseCase(uow as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 10,
      ctx: { motivo: 'Compra', usuarioId: 'u-1' },
    });

    expect(result.quantidadeEstoque).toBe(30);
    const arg = callArg(uow);
    expect(arg.tipo).toBe(TipoMovimentacaoEstoque.ENTRADA);
    expect(arg.quantidade).toBe(10);
    expect(arg.ctx).toEqual({ motivo: 'Compra', usuarioId: 'u-1' });
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const uow = makeUowNotFound();
    const useCase = new AdicionarEstoqueUseCase(uow as any);

    await expect(
      useCase.execute({ id: 'nope', quantidade: 5 }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });

  it('uses empty ctx when none provided', async () => {
    const uow = makeUow(() => fakeProduto(10, 5));
    const useCase = new AdicionarEstoqueUseCase(uow as any);

    await useCase.execute({ id: 'prod-1', quantidade: 5 });

    expect(callArg(uow).ctx).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// RemoverEstoqueUseCase
// ---------------------------------------------------------------------------
describe('RemoverEstoqueUseCase', () => {
  it('removes stock and records a SAIDA movimentacao', async () => {
    const uow = makeUow(() => fakeProduto(20, 5));
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(uow as any, events as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 5,
      ctx: { usuarioId: 'u-1' },
    });

    expect(result.quantidadeEstoque).toBe(15);
    expect(callArg(uow).tipo).toBe(TipoMovimentacaoEstoque.SAIDA);
    expect(callArg(uow).quantidade).toBe(5);
  });

  it('throws InsufficientStockError when quantidade exceeds disponivel', async () => {
    const uow = makeUow(() => fakeProduto(5, 1, 3)); // disponivel = 2
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(uow as any, events as any);

    await expect(
      useCase.execute({ id: 'prod-1', quantidade: 5 }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const uow = makeUowNotFound();
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(uow as any, events as any);

    await expect(
      useCase.execute({ id: 'nope', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });

  it('publishes EstoqueBaixoEvent when stock reaches minimo after removal', async () => {
    const uow = makeUow(() => fakeProduto(11, 10)); // 11 - 2 = 9 <= 10
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).toHaveBeenCalledTimes(1);
    const event = events.publish.mock.calls[0][0];
    expect(event).toBeInstanceOf(EstoqueBaixoEvent);
    expect(event.quantidadeAtual).toBe(9);
    expect(event.estoqueMinimo).toBe(10);
  });

  it('does NOT publish EstoqueBaixoEvent when stock remains above minimo', async () => {
    const uow = makeUow(() => fakeProduto(50, 10)); // 50 - 2 = 48 > 10
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ReservarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('ReservarEstoqueUseCase', () => {
  it('reserves stock and records a RESERVA movimentacao', async () => {
    const uow = makeUow(() => fakeProduto(20, 5));
    const useCase = new ReservarEstoqueUseCase(uow as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 3,
      ctx: { ordemDeServicoId: 'os-9' },
    });

    expect(result.quantidadeReservada).toBe(3);
    const arg = callArg(uow);
    expect(arg.tipo).toBe(TipoMovimentacaoEstoque.RESERVA);
    expect(arg.quantidade).toBe(3);
    expect(arg.ctx).toEqual({ ordemDeServicoId: 'os-9' });
  });

  it('throws InsufficientStockError when reserving more than available', async () => {
    const uow = makeUow(() => fakeProduto(10, 5));
    const useCase = new ReservarEstoqueUseCase(uow as any);

    await expect(
      useCase.execute({ id: 'prod-1', quantidade: 11 }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const uow = makeUowNotFound();
    const useCase = new ReservarEstoqueUseCase(uow as any);

    await expect(
      useCase.execute({ id: 'nope', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });

  it('delegates exactly one movimentacao to the UnitOfWork', async () => {
    const uow = makeUow(() => fakeProduto(11, 10));
    const useCase = new ReservarEstoqueUseCase(uow as any);

    await useCase.execute({ id: 'prod-1', quantidade: 5 });

    expect(uow.mutarComMovimentacao).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// LiberarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('LiberarEstoqueUseCase', () => {
  it('releases reserved stock and records an ESTORNO_RESERVA movimentacao', async () => {
    const uow = makeUow(() => fakeProduto(20, 5, 5));
    const useCase = new LiberarEstoqueUseCase(uow as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 5,
      ctx: { ordemDeServicoId: 'os-9' },
    });

    expect(result.quantidadeReservada).toBe(0);
    const arg = callArg(uow);
    expect(arg.tipo).toBe(TipoMovimentacaoEstoque.ESTORNO_RESERVA);
    expect(arg.quantidade).toBe(5);
    expect(arg.ctx).toEqual({ ordemDeServicoId: 'os-9' });
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const uow = makeUowNotFound();
    const useCase = new LiberarEstoqueUseCase(uow as any);

    await expect(
      useCase.execute({ id: 'nope', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// BaixarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('BaixarEstoqueUseCase', () => {
  it('deducts stock and records a BAIXA movimentacao', async () => {
    const uow = makeUow(() => fakeProduto(20, 5));
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(uow as any, events as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 4,
      ctx: { ordemDeServicoId: 'os-7', motivo: 'Baixa por execucao de servico' },
    });

    expect(result.quantidadeEstoque).toBe(16);
    const arg = callArg(uow);
    expect(arg.tipo).toBe(TipoMovimentacaoEstoque.BAIXA);
    expect(arg.quantidade).toBe(4);
    expect(arg.ctx).toEqual({
      ordemDeServicoId: 'os-7',
      motivo: 'Baixa por execucao de servico',
    });
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const uow = makeUowNotFound();
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(uow as any, events as any);

    await expect(
      useCase.execute({ id: 'nope', quantidade: 1 }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });

  it('publishes EstoqueBaixoEvent when stock reaches minimo after baixa', async () => {
    const uow = makeUow(() => fakeProduto(11, 10)); // 11 - 2 = 9 <= 10
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).toHaveBeenCalledTimes(1);
    const event = events.publish.mock.calls[0][0];
    expect(event).toBeInstanceOf(EstoqueBaixoEvent);
    expect(event.produtoId).toBe('prod-1');
    expect(event.nomeProduto).toBe('Filtro de oleo');
    expect(event.quantidadeAtual).toBe(9);
    expect(event.estoqueMinimo).toBe(10);
  });

  it('does NOT publish EstoqueBaixoEvent when stock is still above minimo', async () => {
    const uow = makeUow(() => fakeProduto(50, 10)); // 50 - 2 = 48 > 10
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ListarMovimentacoesUseCase
// ---------------------------------------------------------------------------
describe('ListarMovimentacoesUseCase', () => {
  it('delegates to gateway.findAll with given params', async () => {
    const paginado = { data: [], total: 0, page: 1, limit: 20 };
    const gateway = { findAll: jest.fn().mockResolvedValue(paginado) };
    const useCase = new ListarMovimentacoesUseCase(gateway as any);

    const result = await useCase.execute({
      page: 1,
      limit: 20,
      produtoId: 'prod-1',
      tipo: TipoMovimentacaoEstoque.ENTRADA,
    });

    expect(gateway.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      produtoId: 'prod-1',
      tipo: TipoMovimentacaoEstoque.ENTRADA,
    });
    expect(result.total).toBe(0);
  });
});
