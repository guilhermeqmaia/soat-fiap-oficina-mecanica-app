import { ValidarUsuarioPorIdUseCase } from './validar-usuario-por-id.use-case';
import { Usuario } from '../../domain/usuario.entity';
import { Role } from '../../domain/role.enum';

describe('ValidarUsuarioPorIdUseCase', () => {
  let gateway: any;
  let useCase: ValidarUsuarioPorIdUseCase;

  const buildUsuario = (overrides: Partial<{ ativo: boolean }> = {}) =>
    Usuario.reconstitute({
      id: 'user-id',
      nome: 'Admin',
      email: 'admin@oficina.com',
      senhaHash: 'hash',
      role: Role.ADMIN,
      ativo: true,
      ...overrides,
    });

  beforeEach(() => {
    gateway = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    useCase = new ValidarUsuarioPorIdUseCase(gateway);
  });

  const input = { id: 'user-id' };

  it('returns the usuario when found and active', async () => {
    const usuario = buildUsuario();
    gateway.findById.mockResolvedValue(usuario);

    const result = await useCase.execute(input);

    expect(result).toBe(usuario);
    expect(gateway.findById).toHaveBeenCalledWith('user-id');
  });

  it('returns null when user is not found', async () => {
    gateway.findById.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect(result).toBeNull();
  });

  it('returns null when user is inactive', async () => {
    gateway.findById.mockResolvedValue(buildUsuario({ ativo: false }));

    const result = await useCase.execute(input);

    expect(result).toBeNull();
  });
});
