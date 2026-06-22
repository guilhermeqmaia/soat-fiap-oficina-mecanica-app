import { AtualizarServicoUseCase } from './atualizar-servico.use-case';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import { Servico } from '../../domain/servico.entity';

describe('AtualizarServicoUseCase', () => {
  let gateway: any;
  let useCase: AtualizarServicoUseCase;

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
      existsByNome: jest.fn(),
      update: jest.fn((s) => Promise.resolve(s)),
    };
    useCase = new AtualizarServicoUseCase(gateway as any);
  });

  it('updates the servico when data is valid', async () => {
    gateway.findById.mockResolvedValue(existing);
    gateway.existsByNome.mockResolvedValue(false);

    const result = await useCase.execute({
      id: 'srv-1',
      nome: 'Alinhamento e balanceamento',
      precoBase: 120,
    });

    expect(result.nome).toBe('Alinhamento e balanceamento');
    expect(result.precoBase.value).toBe(120);
    expect(gateway.update).toHaveBeenCalledTimes(1);
  });

  it('throws ServicoNotFoundError when servico does not exist', async () => {
    gateway.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'nonexistent', nome: 'X' })).rejects.toBeInstanceOf(
      ServicoNotFoundError,
    );
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('throws DuplicateNameError when new nome already exists for another servico', async () => {
    gateway.findById.mockResolvedValue(existing);
    gateway.existsByNome.mockResolvedValue(true);

    await expect(
      useCase.execute({ id: 'srv-1', nome: 'Troca de oleo' }),
    ).rejects.toBeInstanceOf(DuplicateNameError);
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('skips duplicate check when nome is not being changed', async () => {
    gateway.findById.mockResolvedValue(existing);
    gateway.update.mockImplementation((s: Servico) => Promise.resolve(s));

    await useCase.execute({ id: 'srv-1', precoBase: 100 });

    expect(gateway.existsByNome).not.toHaveBeenCalled();
    expect(gateway.update).toHaveBeenCalledTimes(1);
  });
});
