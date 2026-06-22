import { ClientePresenter } from './cliente.presenter';
import { Cliente } from '../../domain/cliente.entity';

function fakeCliente(overrides: Partial<{
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string | null;
}> = {}): Cliente {
  return Cliente.reconstitute({
    id: 'cli-1',
    nome: 'Joao da Silva',
    cpfCnpj: '52998224725',
    telefone: '11999998888',
    email: 'joao@email.com',
    ...overrides,
  });
}

describe('ClientePresenter', () => {
  describe('toResponse', () => {
    it('maps a Cliente entity to the flat response shape', () => {
      const res = ClientePresenter.toResponse(fakeCliente());

      expect(res).toEqual({
        id: 'cli-1',
        nome: 'Joao da Silva',
        cpfCnpj: '52998224725',
        telefone: '11999998888',
        email: 'joao@email.com',
      });
    });

    it('includes email as null when not provided', () => {
      const res = ClientePresenter.toResponse(fakeCliente({ email: null }));

      expect(res.email).toBeNull();
    });
  });

  describe('toPaginatedResponse', () => {
    it('maps a paginated result with correct metadata', () => {
      const res = ClientePresenter.toPaginatedResponse({
        data: [fakeCliente()],
        total: 1,
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].nome).toBe('Joao da Silva');
    });

    it('returns empty data array when result is empty', () => {
      const res = ClientePresenter.toPaginatedResponse({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(0);
      expect(res.total).toBe(0);
    });
  });
});
