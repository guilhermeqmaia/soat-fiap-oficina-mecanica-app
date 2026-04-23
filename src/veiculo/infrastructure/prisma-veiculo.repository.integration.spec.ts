import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaVeiculoRepository } from './prisma-veiculo.repository';
import { Veiculo } from '../domain/veiculo.entity';
import { startTestDatabase, stopTestDatabase } from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaVeiculoRepository (integration)', () => {
  let repository: PrismaVeiculoRepository;
  let prisma: PrismaService;
  let clienteId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaVeiculoRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaVeiculoRepository>(PrismaVeiculoRepository);

    await prisma.onModuleInit();

    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();

    const cliente = await prisma.cliente.create({
      data: { nome: 'Cliente Teste', cpfCnpj: '52998224725', telefone: '11999990000' },
    });
    clienteId = cliente.id;
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.veiculo.deleteMany();
  });

  const buildVeiculo = (overrides: Partial<{
    placa: string; marca: string; modelo: string; ano: number;
  }> = {}) =>
    Veiculo.create({
      placa: overrides.placa ?? 'ABC1D23',
      marca: overrides.marca ?? 'Toyota',
      modelo: overrides.modelo ?? 'Corolla',
      ano: overrides.ano ?? 2024,
      clienteId,
    });

  describe('create', () => {
    it('should persist and return a Veiculo with generated id', async () => {
      const result = await repository.create(buildVeiculo());

      expect(result.id).toBeDefined();
      expect(result.placa.value).toBe('ABC1D23');
      expect(result.marca).toBe('Toyota');
      expect(result.modelo).toBe('Corolla');
      expect(result.ano).toBe(2024);
      expect(result.clienteId).toBe(clienteId);
      expect(result.ativo).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return Veiculo when found', async () => {
      const created = await repository.create(buildVeiculo());

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('existsByPlaca', () => {
    it('should return true when placa exists', async () => {
      await repository.create(buildVeiculo());

      const exists = await repository.existsByPlaca('ABC1D23');
      expect(exists).toBe(true);
    });

    it('should return false when placa does not exist', async () => {
      const exists = await repository.existsByPlaca('XYZ9Z99');
      expect(exists).toBe(false);
    });

    it('should exclude a specific id from the check', async () => {
      const created = await repository.create(buildVeiculo());

      const exists = await repository.existsByPlaca('ABC1D23', created.id!);
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await repository.create(buildVeiculo({ placa: 'AAA1A11', marca: 'Toyota', modelo: 'Corolla' }));
      await repository.create(buildVeiculo({ placa: 'BBB2B22', marca: 'Honda',  modelo: 'Civic' }));
      await repository.create(buildVeiculo({ placa: 'CCC3C33', marca: 'Toyota', modelo: 'Hilux' }));
    });

    it('should return paginated results without filters', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should return second page', async () => {
      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(2);
    });

    it('should filter by clienteId', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, clienteId });

      expect(result.total).toBe(3);
      result.data.forEach((v) => expect(v.clienteId).toBe(clienteId));
    });

    it('should filter by marca (case-insensitive)', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, marca: 'toyota' });

      expect(result.total).toBe(2);
      result.data.forEach((v) => expect(v.marca.toLowerCase()).toContain('toyota'));
    });

    it('should filter by placa (partial, case-insensitive)', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, placa: 'BBB' });

      expect(result.total).toBe(1);
      expect(result.data[0].placa.value).toBe('BBB2B22');
    });

    it('should return empty when filter matches nothing', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, marca: 'Ferrari' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findByClienteId', () => {
    it('should return all veiculos for a cliente', async () => {
      await repository.create(buildVeiculo({ placa: 'DDD4D44' }));
      await repository.create(buildVeiculo({ placa: 'EEE5E55' }));

      const result = await repository.findByClienteId(clienteId);

      expect(result).toHaveLength(2);
      result.forEach((v) => expect(v.clienteId).toBe(clienteId));
    });

    it('should return empty array when cliente has no veiculos', async () => {
      const result = await repository.findByClienteId('00000000-0000-0000-0000-000000000000');
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should persist updated fields', async () => {
      const created = await repository.create(buildVeiculo());
      created.update({ marca: 'Honda', modelo: 'Fit', ano: 2022 });

      const updated = await repository.update(created);

      expect(updated.marca).toBe('Honda');
      expect(updated.modelo).toBe('Fit');
      expect(updated.ano).toBe(2022);

      const fromDb = await repository.findById(created.id!);
      expect(fromDb!.marca).toBe('Honda');
    });
  });

  describe('delete', () => {
    it('should delete a Veiculo', async () => {
      const created = await repository.create(buildVeiculo());

      await repository.delete(created.id!);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });
  });
});
