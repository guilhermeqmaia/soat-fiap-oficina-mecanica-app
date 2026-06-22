import { CriarVeiculoUseCase } from './criar-veiculo.use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { DuplicatePlacaError } from '../../domain/errors/duplicate-placa.error';

describe('CriarVeiculoUseCase', () => {
  let gateway: any;
  let clienteGateway: any;
  let useCase: CriarVeiculoUseCase;

  const input = {
    placa: 'ABC1D23',
    marca: 'Toyota',
    modelo: 'Corolla',
    ano: 2022,
    clienteId: 'cli-1',
  };

  beforeEach(() => {
    gateway = {
      existsByPlaca: jest.fn().mockResolvedValue(false),
      create: jest.fn((v) => Promise.resolve(v)),
    };
    clienteGateway = { findById: jest.fn() };
    useCase = new CriarVeiculoUseCase(gateway, clienteGateway);
  });

  it('throws ClienteNotFoundError when cliente does not exist', async () => {
    clienteGateway.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      ClienteNotFoundError,
    );
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('throws DuplicatePlacaError when placa already exists', async () => {
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    gateway.existsByPlaca.mockResolvedValue(true);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      DuplicatePlacaError,
    );
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('creates and persists the veiculo when validations pass', async () => {
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    const veiculo = await useCase.execute(input);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(veiculo.clienteId).toBe('cli-1');
    expect(veiculo.marca).toBe('Toyota');
  });
});
