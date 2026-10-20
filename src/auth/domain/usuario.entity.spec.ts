import { NameRequiredError } from './errors/name-required.error';
import { Role } from '@guilhermeqmaia/oficina-kit/auth';
import { Usuario } from './usuario.entity';

describe('Usuario (Entity)', () => {
  const validProps = {
    nome: 'Joao Silva',
    email: 'joao@oficina.com',
    senhaHash: '$2b$10$hashedvalue',
    role: Role.ATENDENTE,
  };

  describe('create', () => {
    it('should create a valid Usuario', () => {
      const usuario = Usuario.create(validProps);

      expect(usuario.nome).toBe('Joao Silva');
      expect(usuario.email.value).toBe('joao@oficina.com');
      expect(usuario.senhaHash).toBe('$2b$10$hashedvalue');
      expect(usuario.role).toBe(Role.ATENDENTE);
      expect(usuario.ativo).toBe(true);
    });

    it('should throw when nome is empty', () => {
      expect(() => Usuario.create({ ...validProps, nome: '' })).toThrow(NameRequiredError);
      expect(() => Usuario.create({ ...validProps, nome: '   ' })).toThrow(NameRequiredError);
    });

    it('should throw when email is invalid', () => {
      expect(() => Usuario.create({ ...validProps, email: 'invalid' })).toThrow();
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from persistence data', () => {
      const usuario = Usuario.reconstitute({
        id: 'abc-123',
        nome: 'Maria Santos',
        email: 'maria@oficina.com',
        senhaHash: '$2b$10$otherhash',
        role: Role.ADMIN,
        ativo: false,
      });

      expect(usuario.id).toBe('abc-123');
      expect(usuario.nome).toBe('Maria Santos');
      expect(usuario.email.value).toBe('maria@oficina.com');
      expect(usuario.role).toBe(Role.ADMIN);
      expect(usuario.ativo).toBe(false);
    });
  });

  describe('role checks', () => {
    it('should check if user has a specific role', () => {
      const admin = Usuario.create({ ...validProps, role: Role.ADMIN });
      expect(admin.hasRole(Role.ADMIN)).toBe(true);
      expect(admin.hasRole(Role.CLIENTE)).toBe(false);
    });

    it('should check if user has any of the given roles', () => {
      const mecanico = Usuario.create({ ...validProps, role: Role.MECANICO });
      expect(mecanico.hasAnyRole([Role.MECANICO, Role.ADMIN])).toBe(true);
      expect(mecanico.hasAnyRole([Role.ATENDENTE, Role.CLIENTE])).toBe(false);
    });
  });

  describe('deactivate / activate', () => {
    it('should deactivate a Usuario', () => {
      const usuario = Usuario.create(validProps);
      usuario.deactivate();
      expect(usuario.ativo).toBe(false);
    });

    it('should activate a Usuario', () => {
      const usuario = Usuario.create(validProps);
      usuario.deactivate();
      usuario.activate();
      expect(usuario.ativo).toBe(true);
    });
  });
});
