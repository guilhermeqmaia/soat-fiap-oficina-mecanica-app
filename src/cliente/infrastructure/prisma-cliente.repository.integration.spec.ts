import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClienteRepository } from './prisma-cliente.repository';
import { Cliente } from '../domain/cliente.entity';
import { startTestDatabase, stopTestDatabase } from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaClienteRepository (integration)', () => {
  let repository: PrismaClienteRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaClienteRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaClienteRepository>(PrismaClienteRepository);

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
  });

  const buildCliente = (overrides: Partial<{ nome: string; cpfCnpj: string; email: string }> = {}) =>
    Cliente.create({
      nome: overrides.nome ?? 'Joao Silva',
      cpfCnpj: overrides.cpfCnpj ?? '529.982.247-25',
      telefone: '11999990000',
      email: overrides.email,
    });

  describe('create', () => {
    it('should persist and return a Cliente with generated id', async () => {
      const result = await repository.create(buildCliente());

      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Joao Silva');
      expect(result.cpfCnpj.value).toBe('52998224725');
      expect(result.telefone).toBe('11999990000');
    });

    it('should persist email when provided', async () => {
      const result = await repository.create(buildCliente({ email: 'joao@test.com' }));

      expect(result.email).toBe('joao@test.com');
    });

    it('should persist null email when omitted', async () => {
      const result = await repository.create(buildCliente());

      expect(result.email).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return Cliente when found', async () => {
      const created = await repository.create(buildCliente());

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('existsByCpfCnpj', () => {
    it('should return true when cpfCnpj exists', async () => {
      await repository.create(buildCliente());

      const exists = await repository.existsByCpfCnpj('52998224725');
      expect(exists).toBe(true);
    });

    it('should return false when cpfCnpj does not exist', async () => {
      const exists = await repository.existsByCpfCnpj('00000000000');
      expect(exists).toBe(false);
    });

    it('should exclude a specific id from the check', async () => {
      const created = await repository.create(buildCliente());

      const exists = await repository.existsByCpfCnpj('52998224725', created.id!);
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await repository.create(buildCliente({ nome: 'Ana Lima',    cpfCnpj: '529.982.247-25' }));
      await repository.create(buildCliente({ nome: 'Bruno Costa', cpfCnpj: '261.281.281-49' }));
      await repository.create(buildCliente({ nome: 'Carla Melo',  cpfCnpj: '514.234.103-19' }));
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

    it('should filter by nome (case-insensitive)', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, nome: 'ana' });

      expect(result.total).toBe(1);
      expect(result.data[0].nome).toBe('Ana Lima');
    });

    it('should filter by cpf', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, cpf: '52998224725' });

      expect(result.total).toBe(1);
      expect(result.data[0].cpfCnpj.value).toBe('52998224725');
    });

    it('should filter by cnpj', async () => {
      const empresa = await repository.create(
        buildCliente({ nome: 'Empresa XYZ', cpfCnpj: '11.222.333/0001-81' }),
      );

      const result = await repository.findAll({ page: 1, limit: 10, cnpj: '11222333000181' });

      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe(empresa.id);
    });

    it('should return empty when filter matches nothing', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, nome: 'Inexistente' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should order by nome ascending', async () => {
      const result = await repository.findAll({ page: 1, limit: 10 });

      const names = result.data.map((c) => c.nome);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('update', () => {
    it('should persist updated fields', async () => {
      const created = await repository.create(buildCliente());
      created.update({ nome: 'Joao Silva Junior', telefone: '11888880000' });

      const updated = await repository.update(created);

      expect(updated.nome).toBe('Joao Silva Junior');
      expect(updated.telefone).toBe('11888880000');

      const fromDb = await repository.findById(created.id!);
      expect(fromDb!.nome).toBe('Joao Silva Junior');
    });
  });

  describe('delete', () => {
    it('should delete a Cliente', async () => {
      const created = await repository.create(buildCliente());

      await repository.delete(created.id!);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });
  });
});
