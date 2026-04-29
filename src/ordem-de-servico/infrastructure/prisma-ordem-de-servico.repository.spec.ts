import { Test, TestingModule } from '@nestjs/testing';
import { PrismaOrdemDeServicoRepository } from './prisma-ordem-de-servico.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';

const dbRecord = {
  id: 'os-123',
  numero: 'OS-2026-00001',
  clienteId: 'cliente-123',
  veiculoId: 'veiculo-456',
  usuarioId: null,
  descricaoInicial: 'Cliente relata problemas no freio',
  diagnostico: null,
  status: StatusOS.RECEBIDA,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const dbRecordWithItens = {
  ...dbRecord,
  itensServico: [
    { servicoId: 'serv-abc', quantidade: 2, precoUnitario: 150 },
  ],
};

const mockPrisma = {
  ordemDeServico: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  itemOrdemDeServicoServico: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  itemOrdemDeServicoProduto: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PrismaOrdemDeServicoRepository', () => {
  let repository: PrismaOrdemDeServicoRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaOrdemDeServicoRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaOrdemDeServicoRepository>(PrismaOrdemDeServicoRepository);
  });

  describe('create', () => {
    it('should persist and return an OrdemDeServico', async () => {
      mockPrisma.ordemDeServico.create.mockResolvedValue(dbRecord);

      const os = OrdemDeServico.create({
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        descricaoInicial: 'Cliente relata problemas no freio',
      });

      const result = await repository.create(os);

      expect(result).toBeInstanceOf(OrdemDeServico);
      expect(result.clienteId).toBe('cliente-123');
      expect(mockPrisma.ordemDeServico.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return OrdemDeServico when found', async () => {
      mockPrisma.ordemDeServico.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findById('os-123');

      expect(result).toBeInstanceOf(OrdemDeServico);
      expect(result!.id).toBe('os-123');
    });

    it('should return null when not found', async () => {
      mockPrisma.ordemDeServico.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should map itensServico when present', async () => {
      mockPrisma.ordemDeServico.findUnique.mockResolvedValue(dbRecordWithItens);

      const result = await repository.findById('os-123');

      expect(result).toBeInstanceOf(OrdemDeServico);
      expect(result!.itensServico).toHaveLength(1);
      expect(result!.itensServico[0].servicoId).toBe('serv-abc');
    });
  });

  describe('findAll', () => {
    it('should return paginated result without filters', async () => {
      mockPrisma.ordemDeServico.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.ordemDeServico.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply clienteId filter', async () => {
      mockPrisma.ordemDeServico.findMany.mockResolvedValue([dbRecord]);
      mockPrisma.ordemDeServico.count.mockResolvedValue(1);

      await repository.findAll({ page: 1, limit: 10, clienteId: 'cliente-123' });

      const whereArg = mockPrisma.ordemDeServico.findMany.mock.calls[0][0].where;
      expect(whereArg.clienteId).toBe('cliente-123');
    });

    it('should apply status filter', async () => {
      mockPrisma.ordemDeServico.findMany.mockResolvedValue([]);
      mockPrisma.ordemDeServico.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 10, status: StatusOS.RECEBIDA });

      const whereArg = mockPrisma.ordemDeServico.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(StatusOS.RECEBIDA);
    });

    it('should apply numero filter', async () => {
      mockPrisma.ordemDeServico.findMany.mockResolvedValue([]);
      mockPrisma.ordemDeServico.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 10, numero: 'OS-001' });

      const whereArg = mockPrisma.ordemDeServico.findMany.mock.calls[0][0].where;
      expect(whereArg.numero).toBeDefined();
    });

    it('should use default page and limit when not provided', async () => {
      mockPrisma.ordemDeServico.findMany.mockResolvedValue([]);
      mockPrisma.ordemDeServico.count.mockResolvedValue(0);

      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findByNumero', () => {
    it('should return OrdemDeServico when found by numero', async () => {
      mockPrisma.ordemDeServico.findUnique.mockResolvedValue(dbRecord);

      const result = await repository.findByNumero('OS-2026-00001');

      expect(result).toBeInstanceOf(OrdemDeServico);
    });

    it('should return null when numero not found', async () => {
      mockPrisma.ordemDeServico.findUnique.mockResolvedValue(null);

      const result = await repository.findByNumero('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return OrdemDeServico', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          ordemDeServico: {
            update: jest.fn().mockResolvedValue(dbRecord),
            findUnique: jest.fn().mockResolvedValue(dbRecord),
          },
          itemOrdemDeServicoServico: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          itemOrdemDeServicoProduto: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return cb(tx);
      });

      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: null,
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.RECEBIDA,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.update(os);

      expect(result).toBeInstanceOf(OrdemDeServico);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should call createMany when OS has itensServico', async () => {
      let createManyCalled = false;

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          ordemDeServico: {
            update: jest.fn().mockResolvedValue(dbRecordWithItens),
            findUnique: jest.fn().mockResolvedValue(dbRecordWithItens),
          },
          itemOrdemDeServicoServico: {
            deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            createMany: jest.fn().mockImplementation(() => {
              createManyCalled = true;
              return Promise.resolve({ count: 1 });
            }),
          },
          itemOrdemDeServicoProduto: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return cb(tx);
      });

      const { ItemServicoOS } = await import('../domain/value-objects/item-servico-os.vo');
      const os = OrdemDeServico.reconstitute({
        id: 'os-123',
        numero: 'OS-2026-00001',
        clienteId: 'cliente-123',
        veiculoId: 'veiculo-456',
        usuarioId: 'user-789',
        descricaoInicial: 'Cliente relata problemas no freio',
        diagnostico: null,
        status: StatusOS.EM_DIAGNOSTICO,
        createdAt: new Date(),
        updatedAt: new Date(),
        itensServico: [new ItemServicoOS('serv-abc', 2, 150)],
      });

      const result = await repository.update(os);

      expect(result).toBeInstanceOf(OrdemDeServico);
      expect(createManyCalled).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete OrdemDeServico', async () => {
      mockPrisma.ordemDeServico.delete.mockResolvedValue(dbRecord);

      await repository.delete('os-123');

      expect(mockPrisma.ordemDeServico.delete).toHaveBeenCalledWith({
        where: { id: 'os-123' },
      });
    });
  });

  describe('existsByNumero', () => {
    it('should return true when numero exists', async () => {
      mockPrisma.ordemDeServico.count.mockResolvedValue(1);

      const result = await repository.existsByNumero('OS-2026-00001');

      expect(result).toBe(true);
    });

    it('should return false when numero does not exist', async () => {
      mockPrisma.ordemDeServico.count.mockResolvedValue(0);

      const result = await repository.existsByNumero('nonexistent');

      expect(result).toBe(false);
    });
  });
});
