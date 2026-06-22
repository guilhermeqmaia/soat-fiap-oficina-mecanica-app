import { AtualizarVeiculoUseCase } from './atualizar-veiculo.use-case';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { DuplicatePlacaError } from '../../domain/errors/duplicate-placa.error';
import { Veiculo } from '../../domain/veiculo.entity';

function fakeVeiculo(overrides: Record<string, any> = {}) {
  return {
    id: 'vei-1',
    marca: 'Toyota',
    placa: { value: 'ABC1D23' },
    update: jest.fn(),
    ...overrides,
  };
}

describe('AtualizarVeiculoUseCase', () => {
  let gateway: any;
  let useCase: AtualizarVeiculoUseCase;

  beforeEach(() => {
    gateway = {
      findById: jest.fn(),
      existsByPlaca: jest.fn().mockResolvedValue(false),
      update: jest.fn((v) => Promise.resolve(v)),
    };
    useCase = new AtualizarVeiculoUseCase(gateway);
  });

  it('throws VeiculoNotFoundError when veiculo does not exist', async () => {
    gateway.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ id: 'vei-1', marca: 'Honda' }),
    ).rejects.toBeInstanceOf(VeiculoNotFoundError);
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('throws DuplicatePlacaError when placa is taken by another veiculo', async () => {
    gateway.findById.mockResolvedValue(fakeVeiculo());
    gateway.existsByPlaca.mockResolvedValue(true);
    await expect(
      useCase.execute({ id: 'vei-1', placa: 'XYZ9K88' }),
    ).rejects.toBeInstanceOf(DuplicatePlacaError);
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('skips placa uniqueness check when placa is not changed', async () => {
    const v = fakeVeiculo();
    gateway.findById.mockResolvedValue(v);
    await useCase.execute({ id: 'vei-1', marca: 'Honda' });
    expect(gateway.existsByPlaca).not.toHaveBeenCalled();
    expect(v.update).toHaveBeenCalledWith({ placa: undefined, marca: 'Honda', modelo: undefined, ano: undefined });
    expect(gateway.update).toHaveBeenCalled();
  });

  it('updates and persists the veiculo when validations pass', async () => {
    const v = fakeVeiculo();
    gateway.findById.mockResolvedValue(v);
    const result = await useCase.execute({ id: 'vei-1', placa: 'NEW1A23', marca: 'Honda' });
    expect(gateway.existsByPlaca).toHaveBeenCalledWith('NEW1A23', 'vei-1');
    expect(v.update).toHaveBeenCalled();
    expect(result).toBe(v);
  });
});
