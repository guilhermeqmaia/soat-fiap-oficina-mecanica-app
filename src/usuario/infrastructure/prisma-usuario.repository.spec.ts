import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@guilhermeqmaia/oficina-kit/auth';
import { Usuario } from '../../auth/domain/usuario.entity';

const dbRecord = {
  id: 'uuid-123',
  nome: 'João Mecânico',
  email: 'joao@mecanica.com',
  senhaHash: 'hashed_password',
  role: 'MECANICO',
  ativo: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPrisma = {
  usuario: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaUsuarioRepository', () => {
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

  describe('create', () => {
    it('should persist and return a Usuario', async () => {
      mockPrisma.usuario.create.mockResolvedValue(dbRecord);

      const usuario = Usuario.create({
        nome: 'João Mecânico',
        email: 'joao@mecanica.com',
        senhaHash: 'hashed_password',
        role: Role.MECANICO,
      });

      const result = await repository.create(usuario);

      expect(result).toBeInstanceOf(Usuario);
      expect(result.nome).toBe('João Mecânico');
      expect(mockPrisma.usuario.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return Usuario when found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('uuid-123');

      expect(result).toBeInstanceOf(Usuario);
      expect(result!.nome).toBe('João Mecânico');
    });

    it('should return null when not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return Usuario when email found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findByEmail('joao@mecanica.com');

      expect(result).toBeInstanceOf(Usuario);
      expect(result!.email.value).toBe('joao@mecanica.com');
    });

    it('should return null when email not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply role filter', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, role: 'MECANICO' });

      const whereArg = mockPrisma.usuario.findMany.mock.calls[0][0].where;
      expect(whereArg.role).toBe('MECANICO');
    });

    it('should apply ativo filter', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, ativo: true });

      const whereArg = mockPrisma.usuario.findMany.mock.calls[0][0].where;
      expect(whereArg.ativo).toBe(true);
    });

    it('should apply ativo=false filter', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 10, ativo: false });

      const whereArg = mockPrisma.usuario.findMany.mock.calls[0][0].where;
      expect(whereArg.ativo).toBe(false);
    });

    it('should use default page and limit when not provided', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('update', () => {
    it('should update and return Usuario', async () => {
      mockPrisma.usuario.update.mockResolvedValue(dbRecord);

      const usuario = Usuario.reconstitute({
        id: 'uuid-123',
        nome: 'João Atualizado',
        email: 'joao@mecanica.com',
        senhaHash: 'hashed_password',
        role: Role.MECANICO,
        ativo: true,
      });

      const result = await repository.update(usuario);

      expect(result).toBeInstanceOf(Usuario);
      expect(mockPrisma.usuario.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete Usuario', async () => {
      mockPrisma.usuario.delete.mockResolvedValue(dbRecord);

      await repository.delete('uuid-123');

      expect(mockPrisma.usuario.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });
  });
});
