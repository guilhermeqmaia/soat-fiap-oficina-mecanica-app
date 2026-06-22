import { DeletarServicoUseCase } from './deletar-servico.use-case';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import { Servico } from '../../domain/servico.entity';

describe('DeletarServicoUseCase', () => {
  let gateway: any;
  let useCase: DeletarServicoUseCase;

  const existing = Servico.reconstitute({
    id: 'srv-1',
    nome: 'Alinhamento',
    descricao: null,
    precoBase: 80,
    tempoEstimadoHoras: 0.5,
    ativo: true,
  });

  beforeEach(() => {
    gateway = {
      findById: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new DeletarServicoUseCase(gateway as any);
  });

  it('deletes the servico when it exists', async () => {
    gateway.findById.mockResolvedValue(existing);

    await useCase.execute({ id: 'srv-1' });

    expect(gateway.delete).toHaveBeenCalledWith('srv-1');
  });

  it('throws ServicoNotFoundError when servico does not exist', async () => {
    gateway.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toBeInstanceOf(
      ServicoNotFoundError,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });
});
