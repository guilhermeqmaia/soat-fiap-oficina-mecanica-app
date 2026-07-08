import { CriarOrdemDeServicoUseCase } from './criar-ordem-de-servico.use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../../domain/errors/veiculo-cliente-mismatch.error';
import { ServicoNotFoundInCatalogError } from '../../domain/errors/servico-not-found-in-catalog.error';
import { ProdutoNotFoundInCatalogError } from '../../domain/errors/produto-not-found-in-catalog.error';
import { ProdutoAlreadyAddedError } from '../../domain/errors/produto-already-added.error';

describe('CriarOrdemDeServicoUseCase', () => {
  let gateway: any;
  let clienteGateway: any;
  let veiculoGateway: any;
  let servicoGateway: any;
  let produtoGateway: any;
  let estoque: any;
  let useCase: CriarOrdemDeServicoUseCase;

  const input = {
    clienteId: 'cli-1',
    veiculoId: 'vei-1',
    descricaoInicial: 'Barulho ao frear',
  };

  beforeEach(() => {
    gateway = { create: jest.fn((os) => Promise.resolve(os)) };
    clienteGateway = { findById: jest.fn(), findByCpfCnpj: jest.fn() };
    veiculoGateway = { findById: jest.fn() };
    servicoGateway = { findById: jest.fn() };
    produtoGateway = { findById: jest.fn() };
    estoque = {
      reservar: jest.fn().mockResolvedValue(undefined),
      baixar: jest.fn().mockResolvedValue(undefined),
      liberar: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new CriarOrdemDeServicoUseCase(
      gateway,
      clienteGateway,
      veiculoGateway,
      servicoGateway,
      produtoGateway,
      estoque,
    );
  });

  function withClienteVeiculo() {
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    veiculoGateway.findById.mockResolvedValue({ id: 'vei-1', clienteId: 'cli-1' });
  }

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    clienteGateway.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      ClienteNotFoundError,
    );
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('throws VeiculoNotFoundError when veiculo does not exist', async () => {
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    veiculoGateway.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      VeiculoNotFoundError,
    );
  });

  it('throws VeiculoClienteMismatchError when veiculo belongs to another cliente', async () => {
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    veiculoGateway.findById.mockResolvedValue({
      id: 'vei-1',
      clienteId: 'outro',
    });
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      VeiculoClienteMismatchError,
    );
  });

  it('creates and persists the OS when validations pass', async () => {
    withClienteVeiculo();
    const os = await useCase.execute(input);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(os.clienteId).toBe('cli-1');
    expect(os.veiculoId).toBe('vei-1');
    expect(os.status).toBe('RECEBIDA');
    expect(estoque.reservar).not.toHaveBeenCalled();
  });

  it('opens the OS with initial servicos and pecas, reserving their stock', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue({ precoBase: { value: 100 } });
    produtoGateway.findById.mockResolvedValue({ precoUnitario: { value: 20 } });

    const os = await useCase.execute({
      ...input,
      servicos: [
        { servicoId: 's1', quantidade: 1, produtos: [{ produtoId: 'p1', quantidade: 2 }] },
      ],
    });

    expect(os.itensServico).toHaveLength(1);
    expect(os.itensServico[0].servicoId).toBe('s1');
    expect(os.itensServico[0].precoUnitario).toBe(100);
    expect(os.itensServico[0].produtos).toHaveLength(1);
    expect(os.itensServico[0].produtos[0].produtoId).toBe('p1');
    expect(estoque.reservar).toHaveBeenCalledWith('p1', 2, expect.any(Object));
    expect(gateway.create).toHaveBeenCalledTimes(1);
  });

  it('throws ServicoNotFoundInCatalogError when an initial servico is unknown', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ ...input, servicos: [{ servicoId: 'sX', quantidade: 1 }] }),
    ).rejects.toBeInstanceOf(ServicoNotFoundInCatalogError);
    expect(estoque.reservar).not.toHaveBeenCalled();
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('throws ProdutoNotFoundInCatalogError when an initial peca is unknown', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue({ precoBase: { value: 100 } });
    produtoGateway.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        ...input,
        servicos: [
          { servicoId: 's1', quantidade: 1, produtos: [{ produtoId: 'pX', quantidade: 1 }] },
        ],
      }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundInCatalogError);
    expect(estoque.reservar).not.toHaveBeenCalled();
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('rejects a peca duplicada no mesmo servico na abertura', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue({ precoBase: { value: 100 } });
    produtoGateway.findById.mockResolvedValue({ precoUnitario: { value: 20 } });

    await expect(
      useCase.execute({
        ...input,
        servicos: [
          {
            servicoId: 's1',
            quantidade: 1,
            produtos: [
              { produtoId: 'p1', quantidade: 1 },
              { produtoId: 'p1', quantidade: 2 },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ProdutoAlreadyAddedError);
    expect(estoque.reservar).not.toHaveBeenCalled();
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('compensates partial reservations when stock runs out mid-opening', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue({ precoBase: { value: 100 } });
    produtoGateway.findById.mockResolvedValue({ precoUnitario: { value: 20 } });
    // p1 reserva OK, p2 estoura estoque
    estoque.reservar
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('estoque insuficiente'));

    await expect(
      useCase.execute({
        ...input,
        servicos: [
          {
            servicoId: 's1',
            quantidade: 1,
            produtos: [
              { produtoId: 'p1', quantidade: 2 },
              { produtoId: 'p2', quantidade: 3 },
            ],
          },
        ],
      }),
    ).rejects.toThrow('estoque insuficiente');

    expect(estoque.liberar).toHaveBeenCalledWith('p1', 2, expect.any(Object));
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('compensates reservations when persisting the OS fails', async () => {
    withClienteVeiculo();
    servicoGateway.findById.mockResolvedValue({ precoBase: { value: 100 } });
    produtoGateway.findById.mockResolvedValue({ precoUnitario: { value: 20 } });
    gateway.create.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({
        ...input,
        servicos: [
          { servicoId: 's1', quantidade: 1, produtos: [{ produtoId: 'p1', quantidade: 2 }] },
        ],
      }),
    ).rejects.toThrow('db down');

    expect(estoque.liberar).toHaveBeenCalledWith('p1', 2, expect.any(Object));
  });
});
