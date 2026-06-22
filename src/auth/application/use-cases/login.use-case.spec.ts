import * as bcrypt from 'bcrypt';
import { LoginUseCase } from './login.use-case';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { Usuario } from '../../domain/usuario.entity';
import { Role } from '../../domain/role.enum';

jest.mock('bcrypt');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('LoginUseCase', () => {
  let gateway: any;
  let jwtService: any;
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
    jwtService = { signAsync: jest.fn().mockResolvedValue('token') };
    useCase = new LoginUseCase(gateway, jwtService);
  });

  const input = { email: 'admin@oficina.com', senha: 'admin123' };

  it('throws InvalidCredentialsError when user is not found', async () => {
    gateway.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when user is inactive', async () => {
    gateway.findByEmail.mockResolvedValue(buildUsuario({ ativo: false }));
    mockBcrypt.compare.mockResolvedValue(true as never);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when password does not match', async () => {
    gateway.findByEmail.mockResolvedValue(buildUsuario());
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('returns accessToken and usuario on valid credentials', async () => {
    const usuario = buildUsuario();
    gateway.findByEmail.mockResolvedValue(usuario);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await useCase.execute(input);

    expect(result.accessToken).toBe('token');
    expect(result.usuario).toEqual({
      id: 'user-id',
      nome: 'Admin',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
    });
  });
});
