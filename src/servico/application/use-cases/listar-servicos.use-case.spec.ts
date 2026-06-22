import { ListarServicosUseCase } from './listar-servicos.use-case';
import { Servico } from '../../domain/servico.entity';

describe('ListarServicosUseCase', () => {
  let gateway: any;
  let useCase: ListarServicosUseCase;

  const servico = Servico.reconstitute({
    id: 'srv-1',
    nome: 'Alinhamento',
    descricao: null,
    precoBase: 80,
    tempoEstimadoHoras: 0.5,
    ativo: true,
  });

  beforeEach(() => {
    gateway = { findAll: jest.fn() };
    useCase = new ListarServicosUseCase(gateway as any);
  });

  it('returns paginated result from gateway', async () => {
    const paginatedResult = { data: [servico], total: 1, page: 1, limit: 10 };
    gateway.findAll.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('passes optional nome filter to gateway', async () => {
    gateway.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

    await useCase.execute({ page: 1, limit: 10, nome: 'ali' });

    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, nome: 'ali' });
  });
});
