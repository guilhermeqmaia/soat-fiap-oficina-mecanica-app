import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaServicoRepository } from './prisma-servico.repository';
import { Servico } from '../domain/servico.entity';
import { startTestDatabase, stopTestDatabase } from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaServicoRepository (integration)', () => {
  let repository: PrismaServicoRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaServicoRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaServicoRepository>(PrismaServicoRepository);

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    // Limpar tabelas filhas antes (FK constraint do item_ordem_de_servico_servico)
    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.servico.deleteMany();
  });

  describe('create', () => {
    it('should persist and return a Servico with generated id', async () => {
      const servico = Servico.create({
        nome: 'Troca de oleo',
        descricao: 'Troca de oleo com filtro',
        precoBase: 149.9,
        tempoEstimadoHoras: 1.5,
      });

      const result = await repository.create(servico);

      expect(result.id).toBeDefined();
      expect(result.nome).toBe('Troca de oleo');
      expect(result.precoBase.value).toBe(149.9);
      expect(result.tempoEstimadoHoras).toBe(1.5);
      expect(result.ativo).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return a Servico by id', async () => {
      const created = await repository.create(
        Servico.create({
          nome: 'Alinhamento',
          precoBase: 80,
          tempoEstimadoHoras: 0.5,
        }),
      );

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.nome).toBe('Alinhamento');
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('existsByNome', () => {
    it('should return true when a servico with the same nome exists', async () => {
      await repository.create(
        Servico.create({
          nome: 'Balanceamento',
          precoBase: 60,
          tempoEstimadoHoras: 0.5,
        }),
      );

      const exists = await repository.existsByNome('Balanceamento');
      expect(exists).toBe(true);
    });

    it('should be case-insensitive', async () => {
      await repository.create(
        Servico.create({
          nome: 'Balanceamento',
          precoBase: 60,
          tempoEstimadoHoras: 0.5,
        }),
      );

      const exists = await repository.existsByNome('balanceamento');
      expect(exists).toBe(true);
    });

    it('should return false when no servico with that nome exists', async () => {
      const exists = await repository.existsByNome('Inexistente');
      expect(exists).toBe(false);
    });

    it('should exclude a specific id from the check', async () => {
      const created = await repository.create(
        Servico.create({
          nome: 'Revisao',
          precoBase: 200,
          tempoEstimadoHoras: 3,
        }),
      );

      const exists = await repository.existsByNome('Revisao', created.id!);
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      const items = [
        { nome: 'Alinhamento', precoBase: 80, tempoEstimadoHoras: 0.5 },
        { nome: 'Balanceamento', precoBase: 60, tempoEstimadoHoras: 0.5 },
        { nome: 'Troca de oleo', precoBase: 150, tempoEstimadoHoras: 1.5 },
        { nome: 'Troca de pneu', precoBase: 100, tempoEstimadoHoras: 1 },
        { nome: 'Revisao completa', precoBase: 350, tempoEstimadoHoras: 4 },
      ];

      for (const item of items) {
        await repository.create(Servico.create(item));
      }
    });

    it('should return paginated results', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should return second page', async () => {
      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
    });

    it('should filter by nome (case-insensitive)', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, nome: 'troca' });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data.every((s) => s.nome.toLowerCase().includes('troca'))).toBe(true);
    });

    it('should return empty when filter matches nothing', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, nome: 'xyz' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should order by nome ascending', async () => {
      const result = await repository.findAll({ page: 1, limit: 10 });

      const names = result.data.map((s) => s.nome);
      expect(names).toEqual([...names].sort());
    });
  });

  describe('update', () => {
    it('should update a Servico', async () => {
      const created = await repository.create(
        Servico.create({
          nome: 'Alinhamento',
          precoBase: 80,
          tempoEstimadoHoras: 0.5,
        }),
      );

      created.update({ nome: 'Alinhamento e balanceamento', precoBase: 120 });
      const updated = await repository.update(created);

      expect(updated.nome).toBe('Alinhamento e balanceamento');
      expect(updated.precoBase.value).toBe(120);
    });
  });

  describe('delete', () => {
    it('should delete a Servico', async () => {
      const created = await repository.create(
        Servico.create({
          nome: 'Temporario',
          precoBase: 50,
          tempoEstimadoHoras: 0.5,
        }),
      );

      await repository.delete(created.id!);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });
  });
});
