import { CriarServicoUseCase } from './criar-servico.use-case';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';

describe('CriarServicoUseCase', () => {
  let gateway: any;
  let useCase: CriarServicoUseCase;

  const input = {
    nome: 'Troca de oleo',
    descricao: 'Troca de oleo com filtro',
    precoBase: 149.9,
    tempoEstimadoHoras: 1.5,
  };

  beforeEach(() => {
    gateway = {
      existsByNome: jest.fn(),
      create: jest.fn((s) => Promise.resolve(s)),
    };
    useCase = new CriarServicoUseCase(gateway as any);
  });

  it('creates and persists the servico when nome is unique', async () => {
    gateway.existsByNome.mockResolvedValue(false);

    const servico = await useCase.execute(input);

    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(servico.nome).toBe('Troca de oleo');
    expect(servico.precoBase.value).toBe(149.9);
    expect(servico.ativo).toBe(true);
  });

  it('throws DuplicateNameError when nome already exists', async () => {
    gateway.existsByNome.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(DuplicateNameError);
    expect(gateway.create).not.toHaveBeenCalled();
  });
});
