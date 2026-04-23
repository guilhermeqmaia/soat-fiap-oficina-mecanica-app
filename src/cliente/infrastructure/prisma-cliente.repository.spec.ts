import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClienteRepository } from './prisma-cliente.repository';
import { PrismaService } from '../../prisma/prisma.service';

const dbRecord = {
  id: 'abc-123',
  nome: 'João da Silva',
  cpfCnpj: '52998224725',
  telefone: '11999999999',
  email: 'joao@example.com',
};

const mockPrisma = {
  cliente: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PrismaClienteRepository', () => {
  let repository: PrismaClienteRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaClienteRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaClienteRepository>(PrismaClienteRepository);
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.cliente.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply nome filter', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.cliente.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, nome: 'João' });

      const whereArg = mockPrisma.cliente.findMany.mock.calls[0][0].where;
      expect(whereArg.nome).toBeDefined();
    });

    it('should apply cpf filter', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.cliente.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, cpf: '52998224725' });

      const whereArg = mockPrisma.cliente.findMany.mock.calls[0][0].where;
      expect(whereArg.cpfCnpj).toBeDefined();
    });

    it('should apply cnpj filter', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      mockPrisma.cliente.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 10, cnpj: '11222333000181' });

      const whereArg = mockPrisma.cliente.findMany.mock.calls[0][0].where;
      expect(whereArg.cpfCnpj).toBeDefined();
    });

    it('should return empty list when no records found', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      mockPrisma.cliente.count.mockResolvedValue(0);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('existsByCpfCnpj', () => {
    it('should return true when record exists', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(dbRecord);

      const result = await repository.existsByCpfCnpj('52998224725');

      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);

      const result = await repository.existsByCpfCnpj('00000000000');

      expect(result).toBe(false);
    });

    it('should apply excludeId when provided', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);

      await repository.existsByCpfCnpj('52998224725', 'exclude-id');

      const whereArg = mockPrisma.cliente.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return Cliente when found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('abc-123');

      expect(result).not.toBeNull();
    });

    it('should return null when not found', async () => {
      mockPrisma.cliente.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should persist and return Cliente', async () => {
      mockPrisma.cliente.create.mockResolvedValue(dbRecord);

      const { Cliente } = await import('../domain/cliente.entity');
      const cliente = Cliente.reconstitute({
        id: 'abc-123',
        nome: 'João da Silva',
        cpfCnpj: '52998224725',
        telefone: '11999999999',
        email: 'joao@example.com',
      });

      const result = await repository.create(cliente);

      expect(result).not.toBeNull();
      expect(result.nome).toBe('João da Silva');
      expect(mockPrisma.cliente.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return Cliente', async () => {
      const updated = { ...dbRecord, telefone: '11888888888' };
      mockPrisma.cliente.update.mockResolvedValue(updated);

      const { Cliente } = await import('../domain/cliente.entity');
      const cliente = Cliente.reconstitute({
        id: 'abc-123',
        nome: 'João da Silva',
        cpfCnpj: '52998224725',
        telefone: '11888888888',
        email: 'joao@example.com',
      });

      const result = await repository.update(cliente);

      expect(result).not.toBeNull();
      expect(result.telefone).toBe('11888888888');
      expect(mockPrisma.cliente.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete Cliente by id', async () => {
      mockPrisma.cliente.delete.mockResolvedValue(dbRecord);

      await repository.delete('abc-123');

      expect(mockPrisma.cliente.delete).toHaveBeenCalledWith({
        where: { id: 'abc-123' },
      });
    });
  });
});
