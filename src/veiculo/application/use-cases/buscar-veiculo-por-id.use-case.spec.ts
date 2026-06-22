import { BuscarVeiculoPorIdUseCase } from './buscar-veiculo-por-id.use-case';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';

describe('BuscarVeiculoPorIdUseCase', () => {
  let gateway: any;
  let useCase: BuscarVeiculoPorIdUseCase;

  beforeEach(() => {
    gateway = { findById: jest.fn() };
    useCase = new BuscarVeiculoPorIdUseCase(gateway);
  });

  it('throws VeiculoNotFoundError when veiculo does not exist', async () => {
    gateway.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 'vei-1' })).rejects.toBeInstanceOf(
      VeiculoNotFoundError,
    );
  });

  it('returns veiculo when found', async () => {
    const fakeVeiculo = { id: 'vei-1', marca: 'Honda' };
    gateway.findById.mockResolvedValue(fakeVeiculo);
    const result = await useCase.execute({ id: 'vei-1' });
    expect(result).toBe(fakeVeiculo);
  });
});
