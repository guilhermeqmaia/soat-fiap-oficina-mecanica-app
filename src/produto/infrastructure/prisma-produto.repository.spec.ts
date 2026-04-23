import { Test, TestingModule } from '@nestjs/testing';
import { PrismaProdutoRepository } from './prisma-produto.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Produto } from '../domain/produto.entity';

const dbRecord = {
  id: 'prod-123',
  nome: 'Filtro de Óleo',
  descricao: 'Filtro original',
  precoUnitario: 45.9,
  quantidadeEstoque: 10,
  quantidadeReservada: 0,
  estoqueMinimo: 2,
  ativo: true,
};

const mockPrisma = {
  produto: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaProdutoRepository', () => {
  let repository: PrismaProdutoRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaProdutoRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaProdutoRepository>(PrismaProdutoRepository);
  });

  describe('existsByNome', () => {
    it('should return true when nome exists', async () => {
      mockPrisma.produto.findFirst.mockResolvedValue(dbRecord);

      const result = await repository.existsByNome('Filtro de Óleo');

      expect(result).toBe(true);
    });

    it('should return false when nome does not exist', async () => {
      mockPrisma.produto.findFirst.mockResolvedValue(null);

      const result = await repository.existsByNome('Produto Inexistente');

      expect(result).toBe(false);
    });

    it('should apply excludeId when provided', async () => {
      mockPrisma.produto.findFirst.mockResolvedValue(null);

      await repository.existsByNome('Filtro de Óleo', 'exclude-id');

      const whereArg = mockPrisma.produto.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBeDefined();
    });
  });

  describe('create', () => {
    it('should persist and return Produto', async () => {
      mockPrisma.produto.create.mockResolvedValue(dbRecord);

      const produto = Produto.reconstitute({
        id: 'prod-123',
        nome: 'Filtro de Óleo',
        descricao: 'Filtro original',
        precoUnitario: 45.9,
        quantidadeEstoque: 10,
        quantidadeReservada: 0,
        estoqueMinimo: 2,
        ativo: true,
      });

      const result = await repository.create(produto);

      expect(result).toBeInstanceOf(Produto);
      expect(result.nome).toBe('Filtro de Óleo');
      expect(mockPrisma.produto.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return Produto when found', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('prod-123');

      expect(result).toBeInstanceOf(Produto);
      expect(result!.id).toBe('prod-123');
    });

    it('should return null when not found', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.produto.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply nome filter', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.produto.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, nome: 'Filtro' });

      const whereArg = mockPrisma.produto.findMany.mock.calls[0][0].where;
      expect(whereArg.nome).toBeDefined();
    });

    it('should return empty list when no records found', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([]);
      mockPrisma.produto.count.mockResolvedValue(0);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update and return Produto', async () => {
      const updated = { ...dbRecord, nome: 'Filtro Atualizado' };
      mockPrisma.produto.update.mockResolvedValue(updated);

      const produto = Produto.reconstitute({
        id: 'prod-123',
        nome: 'Filtro Atualizado',
        descricao: 'Filtro original',
        precoUnitario: 45.9,
        quantidadeEstoque: 10,
        quantidadeReservada: 0,
        estoqueMinimo: 2,
        ativo: true,
      });

      const result = await repository.update(produto);

      expect(result).toBeInstanceOf(Produto);
      expect(result.nome).toBe('Filtro Atualizado');
      expect(mockPrisma.produto.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete Produto by id', async () => {
      mockPrisma.produto.delete.mockResolvedValue(dbRecord);

      await repository.delete('prod-123');

      expect(mockPrisma.produto.delete).toHaveBeenCalledWith({
        where: { id: 'prod-123' },
      });
    });
  });
});
