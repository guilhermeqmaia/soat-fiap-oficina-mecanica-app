import { ListarNotificacoesUseCase } from './listar-notificacoes.use-case';

describe('ListarNotificacoesUseCase', () => {
  it('delega ao gateway com os parametros fornecidos', async () => {
    const paginatedResult = { data: [], total: 0, page: 1, limit: 10 };
    const gateway = { findAll: jest.fn().mockResolvedValue(paginatedResult) };
    const useCase = new ListarNotificacoesUseCase(gateway as any);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toBe(paginatedResult);
  });

  it('passa filtros opcionais ao gateway', async () => {
    const gateway = {
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 5 }),
    };
    const useCase = new ListarNotificacoesUseCase(gateway as any);

    await useCase.execute({ page: 1, limit: 5, clienteId: 'cli-1', ordemDeServicoId: 'os-1' });

    expect(gateway.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 5,
      clienteId: 'cli-1',
      ordemDeServicoId: 'os-1',
    });
  });
});
