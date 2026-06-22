import { ListarVeiculosUseCase } from './listar-veiculos.use-case';

describe('ListarVeiculosUseCase', () => {
  it('delegates to the gateway and returns the paginated result', async () => {
    const result = { data: [], total: 0, page: 1, limit: 10 };
    const gateway = { findAll: jest.fn().mockResolvedValue(result) };
    const out = await new ListarVeiculosUseCase(gateway as any).execute({
      page: 1,
      limit: 10,
    });
    expect(out).toBe(result);
    expect(gateway.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });
});
