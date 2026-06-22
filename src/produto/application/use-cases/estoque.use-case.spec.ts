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

function makeUow(produto?: Produto) {
  return {
    persistirAtualizacaoComMovimentacao: jest.fn().mockImplementation(
      async (p, _m) => ({ produto: produto ?? p, movimentacao: _m }),
    ),
  };
}

function makeGateway(produto: Produto | null) {
  return {
    findById: jest.fn().mockResolvedValue(produto),
  };
}

function makeEvents() {
  return { publish: jest.fn() };
}

// ---------------------------------------------------------------------------
// AdicionarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('AdicionarEstoqueUseCase', () => {
  it('adds stock and persists ENTRADA movimentacao', async () => {
    const produto = fakeProduto(20, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new AdicionarEstoqueUseCase(gateway as any, uow as any);

    const result = await useCase.execute({ id: 'prod-1', quantidade: 10, ctx: { motivo: 'Compra', usuarioId: 'u-1' } });

    expect(result.quantidadeEstoque).toBe(30);
    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.tipo).toBe(TipoMovimentacaoEstoque.ENTRADA);
    expect(movArg.quantidade).toBe(10);
    expect(movArg.estoqueResultante).toBe(30);
    expect(movArg.motivo).toBe('Compra');
    expect(movArg.usuarioId).toBe('u-1');
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway(null);
    const uow = makeUow();
    const useCase = new AdicionarEstoqueUseCase(gateway as any, uow as any);

    await expect(useCase.execute({ id: 'nope', quantidade: 5 })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
    expect(uow.persistirAtualizacaoComMovimentacao).not.toHaveBeenCalled();
  });

  it('uses empty ctx when none provided', async () => {
    const produto = fakeProduto(10, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new AdicionarEstoqueUseCase(gateway as any, uow as any);

    await useCase.execute({ id: 'prod-1', quantidade: 5 });

    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.motivo).toBeNull();
    expect(movArg.usuarioId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RemoverEstoqueUseCase
// ---------------------------------------------------------------------------
describe('RemoverEstoqueUseCase', () => {
  it('removes stock and persists SAIDA movimentacao', async () => {
    const produto = fakeProduto(20, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(gateway as any, uow as any, events as any);

    const result = await useCase.execute({ id: 'prod-1', quantidade: 5, ctx: { usuarioId: 'u-1' } });

    expect(result.quantidadeEstoque).toBe(15);
    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.tipo).toBe(TipoMovimentacaoEstoque.SAIDA);
    expect(movArg.quantidade).toBe(5);
  });

  it('throws InsufficientStockError when quantidade exceeds disponivel', async () => {
    const produto = fakeProduto(5, 1, 3); // disponivel = 2
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(gateway as any, uow as any, events as any);

    await expect(useCase.execute({ id: 'prod-1', quantidade: 5 })).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    expect(uow.persistirAtualizacaoComMovimentacao).not.toHaveBeenCalled();
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway(null);
    const uow = makeUow();
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(gateway as any, uow as any, events as any);

    await expect(useCase.execute({ id: 'nope', quantidade: 1 })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });

  it('publishes EstoqueBaixoEvent when stock reaches minimo after removal', async () => {
    const produto = fakeProduto(11, 10);
    // uow returns produto with updated stock
    const updatedProduto = fakeProduto(9, 10);
    const gateway = makeGateway(produto);
    const uow = makeUow(updatedProduto);
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(gateway as any, uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).toHaveBeenCalledTimes(1);
    const event = events.publish.mock.calls[0][0];
    expect(event).toBeInstanceOf(EstoqueBaixoEvent);
    expect(event.eventName).toBe('estoque.baixo');
    expect(event.quantidadeAtual).toBe(9);
    expect(event.estoqueMinimo).toBe(10);
  });

  it('does NOT publish EstoqueBaixoEvent when stock remains above minimo', async () => {
    const produto = fakeProduto(50, 10);
    const updatedProduto = fakeProduto(48, 10);
    const gateway = makeGateway(produto);
    const uow = makeUow(updatedProduto);
    const events = makeEvents();
    const useCase = new RemoverEstoqueUseCase(gateway as any, uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ReservarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('ReservarEstoqueUseCase', () => {
  it('reserves stock and persists RESERVA movimentacao', async () => {
    const produto = fakeProduto(20, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new ReservarEstoqueUseCase(gateway as any, uow as any);

    const result = await useCase.execute({ id: 'prod-1', quantidade: 3, ctx: { ordemDeServicoId: 'os-9' } });

    expect(result.quantidadeReservada).toBe(3);
    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.tipo).toBe(TipoMovimentacaoEstoque.RESERVA);
    expect(movArg.quantidade).toBe(3);
    expect(movArg.ordemDeServicoId).toBe('os-9');
  });

  it('throws InsufficientStockError when reserving more than available', async () => {
    const produto = fakeProduto(10, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new ReservarEstoqueUseCase(gateway as any, uow as any);

    await expect(useCase.execute({ id: 'prod-1', quantidade: 11 })).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
    expect(uow.persistirAtualizacaoComMovimentacao).not.toHaveBeenCalled();
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway(null);
    const uow = makeUow();
    const useCase = new ReservarEstoqueUseCase(gateway as any, uow as any);

    await expect(useCase.execute({ id: 'nope', quantidade: 1 })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });

  it('does NOT publish any event (reserva never triggers low-stock alert)', async () => {
    // Even if after reserving the stock quantity looks low, no event is published
    const produto = fakeProduto(11, 10);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new ReservarEstoqueUseCase(gateway as any, uow as any);

    await useCase.execute({ id: 'prod-1', quantidade: 5 });
    // No events dependency — just verifying no error and UoW was called
    expect(uow.persistirAtualizacaoComMovimentacao).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// LiberarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('LiberarEstoqueUseCase', () => {
  it('releases reserved stock and persists ESTORNO_RESERVA movimentacao', async () => {
    const produto = fakeProduto(20, 5, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const useCase = new LiberarEstoqueUseCase(gateway as any, uow as any);

    const result = await useCase.execute({ id: 'prod-1', quantidade: 5, ctx: { ordemDeServicoId: 'os-9' } });

    expect(result.quantidadeReservada).toBe(0);
    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.tipo).toBe(TipoMovimentacaoEstoque.ESTORNO_RESERVA);
    expect(movArg.quantidade).toBe(5);
    expect(movArg.ordemDeServicoId).toBe('os-9');
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway(null);
    const uow = makeUow();
    const useCase = new LiberarEstoqueUseCase(gateway as any, uow as any);

    await expect(useCase.execute({ id: 'nope', quantidade: 1 })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });
});

// ---------------------------------------------------------------------------
// BaixarEstoqueUseCase
// ---------------------------------------------------------------------------
describe('BaixarEstoqueUseCase', () => {
  it('deducts stock and persists BAIXA movimentacao', async () => {
    const produto = fakeProduto(20, 5);
    const gateway = makeGateway(produto);
    const uow = makeUow();
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(gateway as any, uow as any, events as any);

    const result = await useCase.execute({
      id: 'prod-1',
      quantidade: 4,
      ctx: { ordemDeServicoId: 'os-7', motivo: 'Baixa por execucao de servico' },
    });

    expect(result.quantidadeEstoque).toBe(16);
    const movArg = uow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
    expect(movArg.tipo).toBe(TipoMovimentacaoEstoque.BAIXA);
    expect(movArg.quantidade).toBe(4);
    expect(movArg.estoqueResultante).toBe(16);
    expect(movArg.ordemDeServicoId).toBe('os-7');
    expect(movArg.motivo).toBe('Baixa por execucao de servico');
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway(null);
    const uow = makeUow();
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(gateway as any, uow as any, events as any);

    await expect(useCase.execute({ id: 'nope', quantidade: 1 })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });

  it('publishes EstoqueBaixoEvent when stock reaches minimo after baixa', async () => {
    const produto = fakeProduto(11, 10);
    const updatedProduto = fakeProduto(9, 10);
    const gateway = makeGateway(produto);
    const uow = makeUow(updatedProduto);
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(gateway as any, uow as any, events as any);

    await useCase.execute({ id: 'prod-1', quantidade: 2 });

    expect(events.publish).toHaveBeenCalledTimes(1);
    const event = events.publish.mock.calls[0][0];
    expect(event).toBeInstanceOf(EstoqueBaixoEvent);
    expect(event.eventName).toBe('estoque.baixo');
    expect(event.produtoId).toBe('prod-1');
    expect(event.nomeProduto).toBe('Filtro de oleo');
    expect(event.quantidadeAtual).toBe(9);
    expect(event.estoqueMinimo).toBe(10);
  });

  it('does NOT publish EstoqueBaixoEvent when stock is still above minimo', async () => {
    const produto = fakeProduto(50, 10);
    const updatedProduto = fakeProduto(48, 10);
    const gateway = makeGateway(produto);
    const uow = makeUow(updatedProduto);
    const events = makeEvents();
    const useCase = new BaixarEstoqueUseCase(gateway as any, uow as any, events as any);

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
