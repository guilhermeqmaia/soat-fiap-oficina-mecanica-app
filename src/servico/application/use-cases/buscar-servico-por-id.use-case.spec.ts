import { BuscarServicoPorIdUseCase } from './buscar-servico-por-id.use-case';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import { Servico } from '../../domain/servico.entity';

describe('BuscarServicoPorIdUseCase', () => {
  let gateway: any;
  let useCase: BuscarServicoPorIdUseCase;

  const servico = Servico.reconstitute({
    id: 'srv-1',
    nome: 'Troca de oleo',
    descricao: 'Com filtro',
    precoBase: 149.9,
    tempoEstimadoHoras: 1.5,
    ativo: true,
  });

  beforeEach(() => {
    gateway = { findById: jest.fn() };
    useCase = new BuscarServicoPorIdUseCase(gateway as any);
  });

  it('returns the servico when found', async () => {
    gateway.findById.mockResolvedValue(servico);

    const result = await useCase.execute({ id: 'srv-1' });

    expect(result.nome).toBe('Troca de oleo');
    expect(gateway.findById).toHaveBeenCalledWith('srv-1');
  });

  it('throws ServicoNotFoundError when servico does not exist', async () => {
    gateway.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toBeInstanceOf(
      ServicoNotFoundError,
    );
  });
});
