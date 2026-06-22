import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../../application/use-cases/login.use-case';
import { ValidarUsuarioPorIdUseCase } from '../../application/use-cases/validar-usuario-por-id.use-case';
import { Usuario } from '../../domain/usuario.entity';
import { Role } from '../../domain/role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let validarUsuarioPorId: jest.Mocked<Pick<ValidarUsuarioPorIdUseCase, 'execute'>>;

  beforeEach(() => {
    validarUsuarioPorId = {
      execute: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(
      validarUsuarioPorId as unknown as ValidarUsuarioPorIdUseCase,
      configService,
    );
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'user-id',
      email: 'admin@oficina.com',
      role: Role.ADMIN,
    };

    it('returns the usuario when valid', async () => {
      const usuario = Usuario.reconstitute({
        id: 'user-id',
        nome: 'Admin',
        email: 'admin@oficina.com',
        senhaHash: 'hash',
        role: Role.ADMIN,
        ativo: true,
      });
      validarUsuarioPorId.execute.mockResolvedValue(usuario);

      const result = await strategy.validate(payload);
      expect(result).toBe(usuario);
      expect(validarUsuarioPorId.execute).toHaveBeenCalledWith({ id: 'user-id' });
    });

    it('throws UnauthorizedException when user is not found or inactive', async () => {
      validarUsuarioPorId.execute.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('constructor', () => {
    it('throws when JWT_SECRET is not configured', () => {
      const configServiceWithoutSecret = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      expect(
        () =>
          new JwtStrategy(
            validarUsuarioPorId as unknown as ValidarUsuarioPorIdUseCase,
            configServiceWithoutSecret,
          ),
      ).toThrow('JWT_SECRET is required');
    });
  });
});
