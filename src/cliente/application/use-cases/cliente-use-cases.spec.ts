import { ListarClientesUseCase } from './listar-clientes.use-case';
import { BuscarClientePorIdUseCase } from './buscar-cliente-por-id.use-case';
import { AtualizarClienteUseCase } from './atualizar-cliente.use-case';
import { DeletarClienteUseCase } from './deletar-cliente.use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { Cliente } from '../../domain/cliente.entity';

function fakeCliente(overrides: Record<string, any> = {}): Cliente {
  return Cliente.reconstitute({
    id: 'cli-1',
    nome: 'Joao da Silva',
    cpfCnpj: '52998224725',
    telefone: '11999998888',
    email: 'joao@email.com',
    ...overrides,
  });
}

describe('ListarClientesUseCase', () => {
  it('delegates to the gateway and returns paginated result', async () => {
    const paginated = { data: [fakeCliente()], total: 1, page: 1, limit: 10 };
    const gateway = { findAll: jest.fn().mockResolvedValue(paginated) };

    const out = await new ListarClientesUseCase(gateway as any).execute({
      page: 1,
      limit: 10,
    });

    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(out).toBe(paginated);
  });

  it('passes optional filters to the gateway', async () => {
    const paginated = { data: [], total: 0, page: 1, limit: 10 };
    const gateway = { findAll: jest.fn().mockResolvedValue(paginated) };

    await new ListarClientesUseCase(gateway as any).execute({
      page: 1,
      limit: 10,
      nome: 'Joao',
    });

    expect(gateway.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      nome: 'Joao',
    });
  });
});

describe('BuscarClientePorIdUseCase', () => {
  it('returns the cliente when found', async () => {
    const cliente = fakeCliente();
    const gateway = { findById: jest.fn().mockResolvedValue(cliente) };

    const out = await new BuscarClientePorIdUseCase(gateway as any).execute({
      id: 'cli-1',
    });

    expect(out).toBe(cliente);
    expect(gateway.findById).toHaveBeenCalledWith('cli-1');
  });

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    const gateway = { findById: jest.fn().mockResolvedValue(null) };

    await expect(
      new BuscarClientePorIdUseCase(gateway as any).execute({ id: 'unknown' }),
    ).rejects.toBeInstanceOf(ClienteNotFoundError);
  });
});

describe('AtualizarClienteUseCase', () => {
  it('updates and returns the cliente', async () => {
    const cliente = fakeCliente();
    const gateway = {
      findById: jest.fn().mockResolvedValue(cliente),
      update: jest.fn((c) => Promise.resolve(c)),
    };

    const out = await new AtualizarClienteUseCase(gateway as any).execute({
      id: 'cli-1',
      props: { nome: 'Joao Atualizado' },
    });

    expect(gateway.update).toHaveBeenCalledTimes(1);
    expect(out.nome).toBe('Joao Atualizado');
  });

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    const gateway = { findById: jest.fn().mockResolvedValue(null) };

    await expect(
      new AtualizarClienteUseCase(gateway as any).execute({
        id: 'unknown',
        props: { nome: 'X' },
      }),
    ).rejects.toBeInstanceOf(ClienteNotFoundError);
  });
});

describe('DeletarClienteUseCase', () => {
  it('deletes the cliente when found', async () => {
    const cliente = fakeCliente();
    const gateway = {
      findById: jest.fn().mockResolvedValue(cliente),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    await new DeletarClienteUseCase(gateway as any).execute({ id: 'cli-1' });

    expect(gateway.delete).toHaveBeenCalledWith('cli-1');
  });

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    const gateway = { findById: jest.fn().mockResolvedValue(null) };

    await expect(
      new DeletarClienteUseCase(gateway as any).execute({ id: 'unknown' }),
    ).rejects.toBeInstanceOf(ClienteNotFoundError);
  });
});
