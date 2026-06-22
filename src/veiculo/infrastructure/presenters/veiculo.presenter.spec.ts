import { VeiculoPresenter } from './veiculo.presenter';

function fakeVeiculo(overrides: Record<string, any> = {}) {
  return {
    id: 'vei-1',
    placa: { value: 'ABC1D23' },
    marca: 'Toyota',
    modelo: 'Corolla',
    ano: 2022,
    clienteId: 'cli-1',
    ativo: true,
    ...overrides,
  };
}

describe('VeiculoPresenter', () => {
  describe('toResponse', () => {
    it('maps domain entity to flat response shape', () => {
      const result = VeiculoPresenter.toResponse(fakeVeiculo() as any);
      expect(result).toEqual({
        id: 'vei-1',
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2022,
        clienteId: 'cli-1',
        ativo: true,
      });
    });
  });

  describe('toPaginatedResponse', () => {
    it('maps paginated result with data array', () => {
      const result = VeiculoPresenter.toPaginatedResponse({
        data: [fakeVeiculo() as any],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].placa).toBe('ABC1D23');
    });
  });

  describe('toResponseList', () => {
    it('maps an array of veiculos', () => {
      const list = VeiculoPresenter.toResponseList([
        fakeVeiculo() as any,
        fakeVeiculo({ id: 'vei-2', placa: { value: 'XYZ9K88' } }) as any,
      ]);
      expect(list).toHaveLength(2);
      expect(list[1].placa).toBe('XYZ9K88');
    });
  });
});
