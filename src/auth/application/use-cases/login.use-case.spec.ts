import { LoginUseCase } from './login.use-case';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { Usuario } from '../../domain/usuario.entity';
import { Role } from '../../domain/role.enum';

describe('LoginUseCase', () => {
  let gateway: any;
  let passwordHasher: { hash: jest.Mock; compare: jest.Mock };
  let tokenSigner: { sign: jest.Mock };
  let useCase: LoginUseCase;

  const senhaHash = 'hashed-password';

  const buildUsuario = (overrides: Partial<{ ativo: boolean }> = {}) =>
    Usuario.reconstitute({
      id: 'user-id',
      nome: 'Admin',
      email: 'admin@oficina.com',
      senhaHash,
      role: Role.ADMIN,
      ativo: true,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
    tokenSigner = { sign: jest.fn().mockResolvedValue('token') };
    useCase = new LoginUseCase(gateway, passwordHasher, tokenSigner);
  });

  const input = { email: 'admin@oficina.com', senha: 'admin123' };

  it('throws InvalidCredentialsError when user is not found', async () => {
    gateway.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when user is inactive', async () => {
    gateway.findByEmail.mockResolvedValue(buildUsuario({ ativo: false }));
    passwordHasher.compare.mockResolvedValue(true);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when password does not match', async () => {
    gateway.findByEmail.mockResolvedValue(buildUsuario());
    passwordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  it('returns accessToken and usuario on valid credentials', async () => {
    const usuario = buildUsuario();
    gateway.findByEmail.mockResolvedValue(usuario);
    passwordHasher.compare.mockResolvedValue(true);

    const result = await useCase.execute(input);

    expect(passwordHasher.compare).toHaveBeenCalledWith('admin123', senhaHash);
    expect(result.accessToken).toBe('token');
    expect(result.usuario).toEqual({
      id: 'user-id',
      nome: 'Admin',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
    });
    expect(tokenSigner.sign).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
    });
  });
});
