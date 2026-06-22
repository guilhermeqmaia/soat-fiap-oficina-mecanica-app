import { CriarOrdemDeServicoUseCase } from './criar-ordem-de-servico.use-case';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../../domain/errors/veiculo-cliente-mismatch.error';

describe('CriarOrdemDeServicoUseCase', () => {
  let gateway: any;
  let clienteGateway: any;
  let veiculoGateway: any;
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
    useCase = new CriarOrdemDeServicoUseCase(
      gateway,
      clienteGateway,
      veiculoGateway,
    );
  });

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
    clienteGateway.findById.mockResolvedValue({ id: 'cli-1' });
    veiculoGateway.findById.mockResolvedValue({
      id: 'vei-1',
      clienteId: 'cli-1',
    });
    const os = await useCase.execute(input);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(os.clienteId).toBe('cli-1');
    expect(os.veiculoId).toBe('vei-1');
    expect(os.status).toBe('RECEBIDA');
  });
});
