import { ListarVeiculosPorClienteUseCase } from './listar-veiculos-por-cliente.use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';

describe('ListarVeiculosPorClienteUseCase', () => {
  let gateway: any;
  let clienteGateway: any;
  let useCase: ListarVeiculosPorClienteUseCase;

  const input = { clienteId: 'cli-1' };

  beforeEach(() => {
    gateway = { findByClienteId: jest.fn() };
    clienteGateway = { findById: jest.fn() };
    useCase = new ListarVeiculosPorClienteUseCase(gateway, clienteGateway);
  });

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    clienteGateway.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      ClienteNotFoundError,
    );
    expect(gateway.findByClienteId).not.toHaveBeenCalled();
  });

  it('returns veiculos when cliente exists', async () => {
    const fakeVeiculos = [{ id: 'vei-1' }, { id: 'vei-2' }];
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    gateway.findByClienteId.mockResolvedValue(fakeVeiculos);
    const result = await useCase.execute(input);
    expect(result).toBe(fakeVeiculos);
    expect(gateway.findByClienteId).toHaveBeenCalledWith('cli-1');
  });
});
