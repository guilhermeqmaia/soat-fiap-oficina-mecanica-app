import { Produto } from '../../domain/produto.entity';
import { ProdutoNotFoundError } from '../../domain/errors/produto-not-found.error';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import { CriarProdutoUseCase } from './criar-produto.use-case';
import { ListarProdutosUseCase } from './listar-produtos.use-case';
import { BuscarProdutoPorIdUseCase } from './buscar-produto-por-id.use-case';
import { ListarProdutosEstoqueBaixoUseCase } from './listar-produtos-estoque-baixo.use-case';
import { AtualizarProdutoUseCase } from './atualizar-produto.use-case';
import { DeletarProdutoUseCase } from './deletar-produto.use-case';

function fakeProduto(overrides: Partial<{
  id: string;
  nome: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
}> = {}) {
  return Produto.reconstitute({
    id: overrides.id ?? 'prod-1',
    nome: overrides.nome ?? 'Filtro de oleo',
    descricao: 'Filtro para motor',
    precoUnitario: 29.9,
    quantidadeEstoque: overrides.quantidadeEstoque ?? 50,
    quantidadeReservada: 0,
    estoqueMinimo: overrides.estoqueMinimo ?? 10,
    ativo: true,
  });
}

function makeGateway(overrides: Record<string, any> = {}) {
  return {
    existsByNome: jest.fn().mockResolvedValue(false),
    create: jest.fn((p) => Promise.resolve(p)),
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
    findLowStock: jest.fn().mockResolvedValue([]),
    update: jest.fn((p) => Promise.resolve(p)),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('CriarProdutoUseCase', () => {
  const input = {
    nome: 'Filtro de oleo',
    precoUnitario: 29.9,
    quantidadeEstoque: 50,
    estoqueMinimo: 10,
  };

  it('creates and returns a Produto when nome is unique', async () => {
    const gateway = makeGateway();
    const useCase = new CriarProdutoUseCase(gateway as any);

    const result = await useCase.execute(input);

    expect(gateway.existsByNome).toHaveBeenCalledWith('Filtro de oleo');
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(result.nome).toBe('Filtro de oleo');
  });

  it('throws DuplicateNameError when nome already exists', async () => {
    const gateway = makeGateway({ existsByNome: jest.fn().mockResolvedValue(true) });
    const useCase = new CriarProdutoUseCase(gateway as any);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(DuplicateNameError);
    expect(gateway.create).not.toHaveBeenCalled();
  });
});

describe('ListarProdutosUseCase', () => {
  it('delegates to gateway.findAll with given params', async () => {
    const paginado = { data: [fakeProduto()], total: 1, page: 1, limit: 10 };
    const gateway = makeGateway({ findAll: jest.fn().mockResolvedValue(paginado) });
    const useCase = new ListarProdutosUseCase(gateway as any);

    const result = await useCase.execute({ page: 1, limit: 10, nome: 'filtro' });

    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, nome: 'filtro' });
    expect(result.total).toBe(1);
  });
});

describe('BuscarProdutoPorIdUseCase', () => {
  it('returns the Produto when found', async () => {
    const produto = fakeProduto();
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(produto) });
    const useCase = new BuscarProdutoPorIdUseCase(gateway as any);

    const result = await useCase.execute({ id: 'prod-1' });

    expect(result.nome).toBe('Filtro de oleo');
  });

  it('throws ProdutoNotFoundError when produto does not exist', async () => {
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new BuscarProdutoPorIdUseCase(gateway as any);

    await expect(useCase.execute({ id: 'nope' })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });
});

describe('ListarProdutosEstoqueBaixoUseCase', () => {
  it('returns list from gateway.findLowStock', async () => {
    const produtos = [fakeProduto({ quantidadeEstoque: 3, estoqueMinimo: 5 })];
    const gateway = makeGateway({ findLowStock: jest.fn().mockResolvedValue(produtos) });
    const useCase = new ListarProdutosEstoqueBaixoUseCase(gateway as any);

    const result = await useCase.execute();

    expect(gateway.findLowStock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});

describe('AtualizarProdutoUseCase', () => {
  it('updates nome and preco when valid', async () => {
    const produto = fakeProduto();
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(produto) });
    const useCase = new AtualizarProdutoUseCase(gateway as any);

    const result = await useCase.execute({ id: 'prod-1', props: { nome: 'Filtro premium', precoUnitario: 49.9 } });

    expect(gateway.existsByNome).toHaveBeenCalledWith('Filtro premium', 'prod-1');
    expect(gateway.update).toHaveBeenCalledTimes(1);
    expect(result.nome).toBe('Filtro premium');
    expect(result.precoUnitario.value).toBe(49.9);
  });

  it('throws ProdutoNotFoundError when not found', async () => {
    const gateway = makeGateway();
    const useCase = new AtualizarProdutoUseCase(gateway as any);

    await expect(useCase.execute({ id: 'nope', props: { nome: 'X' } })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
  });

  it('throws DuplicateNameError when new nome is taken', async () => {
    const produto = fakeProduto();
    const gateway = makeGateway({
      findById: jest.fn().mockResolvedValue(produto),
      existsByNome: jest.fn().mockResolvedValue(true),
    });
    const useCase = new AtualizarProdutoUseCase(gateway as any);

    await expect(useCase.execute({ id: 'prod-1', props: { nome: 'Outro' } })).rejects.toBeInstanceOf(
      DuplicateNameError,
    );
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('skips duplicate check when nome is not in props', async () => {
    const produto = fakeProduto();
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(produto) });
    const useCase = new AtualizarProdutoUseCase(gateway as any);

    await useCase.execute({ id: 'prod-1', props: { precoUnitario: 50 } });

    expect(gateway.existsByNome).not.toHaveBeenCalled();
    expect(gateway.update).toHaveBeenCalledTimes(1);
  });
});

describe('DeletarProdutoUseCase', () => {
  it('deletes the produto when found', async () => {
    const produto = fakeProduto();
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(produto) });
    const useCase = new DeletarProdutoUseCase(gateway as any);

    await useCase.execute({ id: 'prod-1' });

    expect(gateway.delete).toHaveBeenCalledWith('prod-1');
  });

  it('throws ProdutoNotFoundError when not found', async () => {
    const gateway = makeGateway();
    const useCase = new DeletarProdutoUseCase(gateway as any);

    await expect(useCase.execute({ id: 'nope' })).rejects.toBeInstanceOf(
      ProdutoNotFoundError,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });
});
