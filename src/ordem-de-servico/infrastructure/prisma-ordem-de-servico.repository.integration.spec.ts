import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaOrdemDeServicoRepository } from './prisma-ordem-de-servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import {
  startTestDatabase,
  stopTestDatabase,
} from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaOrdemDeServicoRepository (integration)', () => {
  let repository: PrismaOrdemDeServicoRepository;
  let prisma: PrismaService;
  let clienteId: string;
  let veiculoId: string;
  let mecanicoId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaOrdemDeServicoRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaOrdemDeServicoRepository>(
      PrismaOrdemDeServicoRepository,
    );

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.usuario.deleteMany();

    const mecanico = await prisma.usuario.create({
      data: {
        nome: 'Mecanico Teste',
        email: 'mecanico@teste.com',
        senhaHash: 'hash',
        role: 'MECANICO',
      },
    });
    mecanicoId = mecanico.id;

    const cliente = await prisma.cliente.create({
      data: {
        nome: 'Cliente Teste',
        cpfCnpj: '12345678901',
        telefone: '11999999999',
      },
    });
    clienteId = cliente.id;

    const veiculo = await prisma.veiculo.create({
      data: {
        placa: 'TST1A23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2022,
        clienteId: cliente.id,
      },
    });
    veiculoId = veiculo.id;
  });

  const makeOsEntity = () =>
    OrdemDeServico.create({
      clienteId,
      veiculoId,
      descricaoInicial: 'Cliente relata problemas no freio dianteiro',
    });

  describe('create', () => {
    it('should persist an OS with diagnosticoAt as null initially', async () => {
      const os = makeOsEntity();
      const result = await repository.create(os);

      expect(result.id).toBeDefined();
      expect(result.diagnostico).toBeNull();
      expect(result.diagnosticoAt).toBeNull();
      expect(result.status).toBe(StatusOS.RECEBIDA);
    });
  });

  describe('findById', () => {
    it('should return OS by id', async () => {
      const created = await repository.create(makeOsEntity());
      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.diagnosticoAt).toBeNull();
    });

    it('should return null when OS not found', async () => {
      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('findByNumero', () => {
    it('should return OS by numero', async () => {
      const created = await repository.create(makeOsEntity());
      const found = await repository.findByNumero(created.numero);

      expect(found).not.toBeNull();
      expect(found!.numero).toBe(created.numero);
    });

    it('should return null when numero not found', async () => {
      const result = await repository.findByNumero('OS-9999-99999');
      expect(result).toBeNull();
    });
  });

  describe('existsByNumero', () => {
    it('should return true when numero exists', async () => {
      const created = await repository.create(makeOsEntity());
      const exists = await repository.existsByNumero(created.numero);
      expect(exists).toBe(true);
    });

    it('should return false when numero does not exist', async () => {
      const exists = await repository.existsByNumero('OS-0000-00000');
      expect(exists).toBe(false);
    });
  });

  describe('update — adicionarDiagnostico', () => {
    it('should persist diagnostico and diagnosticoAt without changing status', async () => {
      const created = await repository.create(makeOsEntity());

      created.atribuirMecanico(mecanicoId);
      await repository.update(created);

      const withMecanico = await repository.findById(created.id!);
      expect(withMecanico!.status).toBe(StatusOS.EM_DIAGNOSTICO);

      const before = new Date();
      withMecanico!.adicionarDiagnostico(
        'Pastilhas de freio dianteiras desgastadas',
      );
      const updated = await repository.update(withMecanico!);
      const after = new Date();

      expect(updated.diagnostico).toBe(
        'Pastilhas de freio dianteiras desgastadas',
      );
      expect(updated.diagnosticoAt).not.toBeNull();
      expect(updated.diagnosticoAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(updated.diagnosticoAt!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
      expect(updated.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it('should allow updating diagnostico while in EM_DIAGNOSTICO', async () => {
      const created = await repository.create(makeOsEntity());
      created.atribuirMecanico(mecanicoId);
      await repository.update(created);

      const withMecanico = await repository.findById(created.id!);
      withMecanico!.adicionarDiagnostico('Primeiro diagnostico registrado');
      await repository.update(withMecanico!);

      const afterFirst = await repository.findById(created.id!);
      afterFirst!.adicionarDiagnostico('Diagnostico atualizado com mais detalhes');
      const final = await repository.update(afterFirst!);

      expect(final.diagnostico).toBe('Diagnostico atualizado com mais detalhes');
      expect(final.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await repository.create(makeOsEntity());
      }
    });

    it('should return paginated OS list', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should filter by clienteId', async () => {
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        clienteId,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((os) => os.clienteId === clienteId)).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        status: StatusOS.RECEBIDA,
      });

      expect(result.data.every((os) => os.status === StatusOS.RECEBIDA)).toBe(
        true,
      );
    });

    it('should use defaults when page and limit are not provided', async () => {
      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete an OS', async () => {
      const created = await repository.create(makeOsEntity());

      await repository.delete(created.id!);

      const found = await repository.findById(created.id!);
      expect(found).toBeNull();
    });
  });
});
