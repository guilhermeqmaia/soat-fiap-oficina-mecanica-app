import { AuthController } from './auth.controller';
import { AuthenticatedUser } from '@guilhermeqmaia/oficina-kit/auth';
import { Role } from '@guilhermeqmaia/oficina-kit/auth';

describe('AuthController (resource server)', () => {
  it('GET /auth/me devolve a identidade das claims do token', () => {
    const controller = new AuthController();
    const user = new AuthenticatedUser('cli-1', 'Ana Souza', '52998224725', Role.CLIENTE);

    expect(controller.me(user)).toEqual({
      id: 'cli-1',
      nome: 'Ana Souza',
      cpf: '52998224725',
      role: Role.CLIENTE,
    });
  });
});
