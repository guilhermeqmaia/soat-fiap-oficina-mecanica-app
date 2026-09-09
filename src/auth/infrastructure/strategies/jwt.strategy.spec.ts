import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { AuthenticatedUser } from '../../domain/authenticated-user';
import { Role } from '../../domain/role.enum';

describe('JwtStrategy (resource server — US-F3-03)', () => {
  function makeStrategy(env: Record<string, string | undefined> = {}) {
    const values: Record<string, string | undefined> = {
      JWT_SECRET: 'test-secret',
      ...env,
    };
    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new JwtStrategy(configService);
  }

  const payload: JwtPayload = {
    sub: 'cli-1',
    cpf: '52998224725',
    nome: 'Ana Souza',
    role: 'CLIENTE',
    iss: 'oficina-auth-lambda',
  };

  it('exige JWT_SECRET no ambiente', () => {
    expect(() => makeStrategy({ JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
  });

  it('monta o principal direto das claims, sem consultar banco', () => {
    const user = makeStrategy().validate(payload);
    expect(user).toBeInstanceOf(AuthenticatedUser);
    expect(user).toMatchObject({
      id: 'cli-1',
      nome: 'Ana Souza',
      cpf: '52998224725',
      role: Role.CLIENTE,
    });
  });

  it('aceita token de staff com a role do usuario', () => {
    const user = makeStrategy().validate({ ...payload, sub: 'usr-1', role: 'MECANICO' });
    expect(user.role).toBe(Role.MECANICO);
    expect(user.hasAnyRole([Role.MECANICO, Role.ADMIN])).toBe(true);
  });

  it('rejeita role desconhecida', () => {
    expect(() => makeStrategy().validate({ ...payload, role: 'SUPREMO' })).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita token sem sub', () => {
    expect(() => makeStrategy().validate({ ...payload, sub: '' })).toThrow(UnauthorizedException);
  });

  it('tolera claims opcionais ausentes (nome/cpf)', () => {
    const user = makeStrategy().validate({ sub: 'u1', role: 'ADMIN', iss: 'oficina-auth-lambda' });
    expect(user.nome).toBe('');
    expect(user.cpf).toBeNull();
  });
});

describe('AuthenticatedUser.possuiDocumento', () => {
  const user = new AuthenticatedUser('cli-1', 'Ana', '52998224725', Role.CLIENTE);

  it('compara ignorando mascara', () => {
    expect(user.possuiDocumento('529.982.247-25')).toBe(true);
    expect(user.possuiDocumento('52998224725')).toBe(true);
  });

  it('nega documento divergente ou principal sem cpf', () => {
    expect(user.possuiDocumento('11144477735')).toBe(false);
    const semCpf = new AuthenticatedUser('u1', 'X', null, Role.ADMIN);
    expect(semCpf.possuiDocumento('52998224725')).toBe(false);
  });
});
