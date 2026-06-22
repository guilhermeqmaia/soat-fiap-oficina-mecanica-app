import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { Usuario } from '../domain/usuario.entity';
import { Role } from '../domain/role.enum';

const mockLoginUseCase = {
  execute: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: LoginUseCase, useValue: mockLoginUseCase }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login', () => {
    it('returns token and user info on success', async () => {
      mockLoginUseCase.execute.mockResolvedValue({
        accessToken: 'jwt-token',
        usuario: {
          id: 'user-id',
          nome: 'Admin',
          email: 'admin@oficina.com',
          role: Role.ADMIN,
        },
      });

      const result = await controller.login({
        email: 'admin@oficina.com',
        senha: 'admin123',
      });

      expect(result.accessToken).toBe('jwt-token');
      expect(result.usuario.role).toBe(Role.ADMIN);
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'admin@oficina.com',
        senha: 'admin123',
      });
    });

    it('propagates errors from LoginUseCase (no try/catch)', async () => {
      const error = new Error('domain error');
      mockLoginUseCase.execute.mockRejectedValue(error);

      await expect(
        controller.login({ email: 'x@x.com', senha: 'xxxxxx' }),
      ).rejects.toThrow('domain error');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user info', async () => {
      const usuario = Usuario.reconstitute({
        id: 'user-id',
        nome: 'Admin',
        email: 'admin@oficina.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });

      const result = await controller.me(usuario);
      expect(result).toEqual({
        id: 'user-id',
        nome: 'Admin',
        email: 'admin@oficina.com',
        role: Role.ADMIN,
      });
    });
  });
});
