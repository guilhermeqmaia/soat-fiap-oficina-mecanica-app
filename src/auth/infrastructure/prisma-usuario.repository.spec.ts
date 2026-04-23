import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../domain/role.enum';
import { Usuario } from '../domain/usuario.entity';

const dbRecord = {
  id: 'user-123',
  nome: 'Test User',
  email: 'test@example.com',
  senhaHash: 'hashed',
  role: Role.ATENDENTE,
  ativo: true,
};

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('PrismaUsuarioRepository (auth)', () => {
  let repository: PrismaUsuarioRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUsuarioRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaUsuarioRepository>(PrismaUsuarioRepository);
  });

  describe('findByEmail', () => {
    it('should return Usuario when found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeInstanceOf(Usuario);
      expect(result!.email.value).toBe('test@example.com');
    });

    it('should return null when not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should lowercase email when querying', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await repository.findByEmail('UPPER@EXAMPLE.COM');

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@example.com' },
      });
    });
  });

  describe('findById', () => {
    it('should return Usuario when found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('user-123');

      expect(result).toBeInstanceOf(Usuario);
      expect(result!.id).toBe('user-123');
    });

    it('should return null when not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should persist and return Usuario', async () => {
      mockPrisma.usuario.create.mockResolvedValue(dbRecord);

      const usuario = Usuario.create({
        nome: 'Test User',
        email: 'test@example.com',
        senhaHash: 'hashed',
        role: Role.ATENDENTE,
      });

      const result = await repository.create(usuario);

      expect(result).toBeInstanceOf(Usuario);
      expect(result.nome).toBe('Test User');
      expect(result.role).toBe(Role.ATENDENTE);
      expect(mockPrisma.usuario.create).toHaveBeenCalled();
    });
  });
});
