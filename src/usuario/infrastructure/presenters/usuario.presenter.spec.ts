import { UsuarioPresenter } from './usuario.presenter';
import { Usuario } from '../../../auth/domain/usuario.entity';
import { Role } from '../../../auth/domain/role.enum';

function fakeUsuario(overrides: Partial<{
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
  ativo: boolean;
}> = {}): Usuario {
  return Usuario.reconstitute({
    id: overrides.id ?? 'uuid-1',
    nome: overrides.nome ?? 'João',
    email: overrides.email ?? 'joao@test.com',
    senhaHash: overrides.senhaHash ?? 'hash',
    role: overrides.role ?? Role.MECANICO,
    ativo: overrides.ativo !== undefined ? overrides.ativo : true,
  });
}

describe('UsuarioPresenter', () => {
  describe('toOutput', () => {
    it('maps Usuario entity to UsuarioOutput shape', () => {
      const usuario = fakeUsuario({ id: 'uuid-1', nome: 'João', email: 'joao@test.com', ativo: true });
      const output = UsuarioPresenter.toOutput(usuario);
      expect(output.id).toBe('uuid-1');
      expect(output.nome).toBe('João');
      expect(output.email).toBe('joao@test.com');
      expect(output.role).toBe('MECANICO');
      expect(output.ativo).toBe(true);
    });

    it('does not include senhaHash in output', () => {
      const usuario = fakeUsuario();
      const output = UsuarioPresenter.toOutput(usuario) as any;
      expect(output.senhaHash).toBeUndefined();
    });

    it('maps email value object to string', () => {
      const usuario = fakeUsuario({ email: 'maria@test.com' });
      const output = UsuarioPresenter.toOutput(usuario);
      expect(typeof output.email).toBe('string');
      expect(output.email).toBe('maria@test.com');
    });
  });

  describe('toPaginatedResponse', () => {
    it('maps paginated result of Usuario to paginated UsuarioOutput', () => {
      const usuario = fakeUsuario({ id: 'uuid-1' });
      const result = UsuarioPresenter.toPaginatedResponse({
        data: [usuario],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('uuid-1');
    });

    it('maps empty paginated result correctly', () => {
      const result = UsuarioPresenter.toPaginatedResponse({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
