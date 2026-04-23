import { Test, TestingModule } from '@nestjs/testing';
import { PrismaServicoRepository } from './prisma-servico.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Servico } from '../domain/servico.entity';

const dbRecord = {
  id: 'serv-123',
  nome: 'Troca de Óleo',
  descricao: 'Troca completa com filtro',
  precoBase: 120.0,
  tempoEstimadoHoras: 1,
  ativo: true,
};

const mockPrisma = {
  servico: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaServicoRepository', () => {
  let repository: PrismaServicoRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaServicoRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaServicoRepository>(PrismaServicoRepository);
  });

  describe('existsByNome', () => {
    it('should return true when nome exists', async () => {
      mockPrisma.servico.findFirst.mockResolvedValue(dbRecord);

      const result = await repository.existsByNome('Troca de Óleo');

      expect(result).toBe(true);
    });

    it('should return false when nome does not exist', async () => {
      mockPrisma.servico.findFirst.mockResolvedValue(null);

      const result = await repository.existsByNome('Servico Inexistente');

      expect(result).toBe(false);
    });

    it('should apply excludeId when provided', async () => {
      mockPrisma.servico.findFirst.mockResolvedValue(null);

      await repository.existsByNome('Troca de Óleo', 'exclude-id');

      const whereArg = mockPrisma.servico.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBeDefined();
    });
  });

  describe('create', () => {
    it('should persist and return Servico', async () => {
      mockPrisma.servico.create.mockResolvedValue(dbRecord);

      const servico = Servico.reconstitute({
        id: 'serv-123',
        nome: 'Troca de Óleo',
        descricao: 'Troca completa com filtro',
        precoBase: 120.0,
        tempoEstimadoHoras: 1,
        ativo: true,
      });

      const result = await repository.create(servico);

      expect(result).toBeInstanceOf(Servico);
      expect(result.nome).toBe('Troca de Óleo');
      expect(mockPrisma.servico.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return Servico when found', async () => {
      mockPrisma.servico.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('serv-123');

      expect(result).toBeInstanceOf(Servico);
      expect(result!.id).toBe('serv-123');
    });

    it('should return null when not found', async () => {
      mockPrisma.servico.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.servico.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.servico.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply nome filter', async () => {
      mockPrisma.servico.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.servico.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, nome: 'Troca' });

      const whereArg = mockPrisma.servico.findMany.mock.calls[0][0].where;
      expect(whereArg.nome).toBeDefined();
    });

    it('should return empty list when no records found', async () => {
      mockPrisma.servico.findMany.mockResolvedValue([]);
      mockPrisma.servico.count.mockResolvedValue(0);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update and return Servico', async () => {
      const updated = { ...dbRecord, nome: 'Troca de Óleo Sintético' };
      mockPrisma.servico.update.mockResolvedValue(updated);

      const servico = Servico.reconstitute({
        id: 'serv-123',
        nome: 'Troca de Óleo Sintético',
        descricao: 'Troca completa com filtro',
        precoBase: 120.0,
        tempoEstimadoHoras: 1,
        ativo: true,
      });

      const result = await repository.update(servico);

      expect(result).toBeInstanceOf(Servico);
      expect(result.nome).toBe('Troca de Óleo Sintético');
      expect(mockPrisma.servico.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete Servico by id', async () => {
      mockPrisma.servico.delete.mockResolvedValue(dbRecord);

      await repository.delete('serv-123');

      expect(mockPrisma.servico.delete).toHaveBeenCalledWith({
        where: { id: 'serv-123' },
      });
    });
  });
});
