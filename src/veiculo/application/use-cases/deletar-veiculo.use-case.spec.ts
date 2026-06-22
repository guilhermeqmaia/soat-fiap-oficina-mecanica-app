import { DeletarVeiculoUseCase } from './deletar-veiculo.use-case';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';

describe('DeletarVeiculoUseCase', () => {
  let gateway: any;
  let useCase: DeletarVeiculoUseCase;

  beforeEach(() => {
    gateway = {
      findById: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new DeletarVeiculoUseCase(gateway);
  });

  it('throws VeiculoNotFoundError when veiculo does not exist', async () => {
    gateway.findById.mockResolvedValue(null);
    await expect(useCase.execute({ id: 'vei-1' })).rejects.toBeInstanceOf(
      VeiculoNotFoundError,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it('deletes the veiculo when found', async () => {
    gateway.findById.mockResolvedValue({ id: 'vei-1' });
    await useCase.execute({ id: 'vei-1' });
    expect(gateway.delete).toHaveBeenCalledWith('vei-1');
  });
});
