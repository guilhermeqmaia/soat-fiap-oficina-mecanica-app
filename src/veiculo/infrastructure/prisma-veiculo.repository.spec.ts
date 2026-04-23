import { Test, TestingModule } from '@nestjs/testing';
import { PrismaVeiculoRepository } from './prisma-veiculo.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Veiculo } from '../domain/veiculo.entity';

const dbRecord = {
  id: 'abc-123',
  placa: 'ABC1D23',
  marca: 'Toyota',
  modelo: 'Corolla',
  ano: 2024,
  clienteId: 'cliente-uuid-123',
  ativo: true,
};

const mockPrisma = {
  veiculo: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaVeiculoRepository', () => {
  let repository: PrismaVeiculoRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaVeiculoRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaVeiculoRepository>(PrismaVeiculoRepository);
  });

  describe('existsByPlaca', () => {
    it('should return true when placa exists', async () => {
      mockPrisma.veiculo.findFirst.mockResolvedValue(dbRecord);
      const result = await repository.existsByPlaca('ABC1D23');
      expect(result).toBe(true);
    });

    it('should return false when placa does not exist', async () => {
      mockPrisma.veiculo.findFirst.mockResolvedValue(null);
      const result = await repository.existsByPlaca('XYZ9999');
      expect(result).toBe(false);
    });

    it('should apply excludeId when provided', async () => {
      mockPrisma.veiculo.findFirst.mockResolvedValue(null);
      await repository.existsByPlaca('ABC1D23', 'exclude-id');
      const whereArg = mockPrisma.veiculo.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBeDefined();
    });
  });

  describe('create', () => {
    it('should persist and return a Veiculo', async () => {
      mockPrisma.veiculo.create.mockResolvedValue(dbRecord);
      const veiculo = Veiculo.reconstitute({
        id: 'new-id',
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2024,
        clienteId: 'cliente-uuid-123',
        ativo: true,
      });
      const result = await repository.create(veiculo);
      expect(result).toBeInstanceOf(Veiculo);
    });
  });

  describe('findById', () => {
    it('should return Veiculo when found', async () => {
      mockPrisma.veiculo.findUnique.mockResolvedValue(dbRecord);
      const result = await repository.findById('abc-123');
      expect(result).toBeInstanceOf(Veiculo);
    });

    it('should return null when not found', async () => {
      mockPrisma.veiculo.findUnique.mockResolvedValue(null);
      const result = await repository.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.veiculo.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply clienteId filter', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.veiculo.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, clienteId: 'cliente-uuid-123' });

      const whereArg = mockPrisma.veiculo.findMany.mock.calls[0][0].where;
      expect(whereArg.clienteId).toBe('cliente-uuid-123');
    });

    it('should apply marca filter', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.veiculo.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, marca: 'Toyota' });

      const whereArg = mockPrisma.veiculo.findMany.mock.calls[0][0].where;
      expect(whereArg.marca).toBeDefined();
    });

    it('should apply placa filter', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.veiculo.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, placa: 'ABC-1D23' });

      const whereArg = mockPrisma.veiculo.findMany.mock.calls[0][0].where;
      expect(whereArg.placa).toBeDefined();
    });

    it('should return empty list when no records found', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([]);
      mockPrisma.veiculo.count.mockResolvedValue(0);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findByClienteId', () => {
    it('should return veiculos for a cliente', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([dbRecord]);

      const result = await repository.findByClienteId('cliente-uuid-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Veiculo);
    });

    it('should return empty array when cliente has no veiculos', async () => {
      mockPrisma.veiculo.findMany.mockResolvedValue([]);

      const result = await repository.findByClienteId('cliente-uuid-999');

      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update and return Veiculo', async () => {
      const updated = { ...dbRecord, marca: 'Honda' };
      mockPrisma.veiculo.update.mockResolvedValue(updated);

      const veiculo = Veiculo.reconstitute({
        id: 'abc-123',
        placa: 'ABC1D23',
        marca: 'Honda',
        modelo: 'Civic',
        ano: 2024,
        clienteId: 'cliente-uuid-123',
        ativo: true,
      });

      const result = await repository.update(veiculo);

      expect(result).toBeInstanceOf(Veiculo);
      expect(result.marca).toBe('Honda');
      expect(mockPrisma.veiculo.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete Veiculo by id', async () => {
      mockPrisma.veiculo.delete.mockResolvedValue(dbRecord);

      await repository.delete('abc-123');

      expect(mockPrisma.veiculo.delete).toHaveBeenCalledWith({
        where: { id: 'abc-123' },
      });
    });
  });
});
