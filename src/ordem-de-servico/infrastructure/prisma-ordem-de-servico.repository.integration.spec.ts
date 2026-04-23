import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaOrdemDeServicoRepository } from './prisma-ordem-de-servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { ItemServicoOS } from '../domain/value-objects/item-servico-os.vo';
import { startTestDatabase, stopTestDatabase } from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaOrdemDeServicoRepository (integration)', () => {
  let repository: PrismaOrdemDeServicoRepository;
  let prisma: PrismaService;

  let clienteId: string;
  let veiculoId: string;
  let usuarioId: string;
  let servicoId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaOrdemDeServicoRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaOrdemDeServicoRepository>(PrismaOrdemDeServicoRepository);

    await prisma.onModuleInit();

    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.servico.deleteMany();
    await prisma.usuario.deleteMany();

    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Mecanico Teste',
        email: 'mecanico.os.repo@oficina.com',
        senhaHash: '$2b$10$hashed',
        role: 'MECANICO',
        ativo: true,
      },
    });
    usuarioId = usuario.id;

    const cliente = await prisma.cliente.create({
      data: {
        nome: 'Cliente Teste',
        cpfCnpj: '52998224725',
        telefone: '11999990000',
        email: 'cliente@test.com',
      },
    });
    clienteId = cliente.id;

    const veiculo = await prisma.veiculo.create({
      data: {
        placa: 'ABC1D23',
        marca: 'Toyota',
        modelo: 'Corolla',
        ano: 2024,
        clienteId,
        ativo: true,
      },
    });
    veiculoId = veiculo.id;

    const servico = await prisma.servico.create({
      data: {
        nome: 'Troca de oleo',
        precoBase: 150.0,
        tempoEstimadoHoras: 1,
        ativo: true,
      },
    });
    servicoId = servico.id;
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
  });

  const buildOs = (overrides: Partial<Parameters<typeof OrdemDeServico.create>[0]> = {}) =>
    OrdemDeServico.create({
      clienteId,
      veiculoId,
      descricaoInicial: 'Cliente relata barulho ao frenar',
      ...overrides,
    });

  describe('create', () => {
    it('should persist and return an OrdemDeServico with generated id', async () => {
      const os = buildOs();
      const result = await repository.create(os);

      expect(result.id).toBeDefined();
      expect(result.clienteId).toBe(clienteId);
      expect(result.veiculoId).toBe(veiculoId);
      expect(result.status).toBe(StatusOS.RECEBIDA);
      expect(result.usuarioId).toBeNull();
      expect(result.itensServico).toHaveLength(0);
    });

    it('should generate a unique numero for each OS', async () => {
      const os1 = await repository.create(buildOs());
      const os2 = await repository.create(buildOs());

      expect(os1.numero).not.toBe(os2.numero);
    });
  });

  describe('findById', () => {
    it('should return OrdemDeServico when found', async () => {
      const created = await repository.create(buildOs());

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.status).toBe(StatusOS.RECEBIDA);
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('should return itensServico when OS has services', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 2, 150));
      const updated = await repository.update(os);

      const found = await repository.findById(updated.id!);

      expect(found!.itensServico).toHaveLength(1);
      expect(found!.itensServico[0].servicoId).toBe(servicoId);
      expect(found!.itensServico[0].quantidade).toBe(2);
      expect(found!.itensServico[0].precoUnitario).toBe(150);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      for (let i = 0; i < 4; i++) {
        await repository.create(buildOs());
      }
    });

    it('should return paginated results', async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should return second page', async () => {
      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2);
    });

    it('should use default page and limit when not provided', async () => {
      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by clienteId', async () => {
      const result = await repository.findAll({ page: 1, limit: 10, clienteId });

      expect(result.total).toBe(4);
      result.data.forEach((os) => expect(os.clienteId).toBe(clienteId));
    });

    it('should filter by status', async () => {
      const created = await repository.create(buildOs());
      created.atribuirMecanico(usuarioId);
      await repository.update(created);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        status: StatusOS.EM_DIAGNOSTICO,
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.data.forEach((os) => expect(os.status).toBe(StatusOS.EM_DIAGNOSTICO));
    });

    it('should filter by numero', async () => {
      const created = await repository.create(buildOs());

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        numero: created.numero,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].numero).toBe(created.numero);
    });
  });

  describe('findByNumero', () => {
    it('should return OrdemDeServico when found by numero', async () => {
      const created = await repository.create(buildOs());

      const found = await repository.findByNumero(created.numero);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null when numero not found', async () => {
      const found = await repository.findByNumero('OS-INEXISTENTE-000');
      expect(found).toBeNull();
    });
  });

  describe('existsByNumero', () => {
    it('should return true when numero exists', async () => {
      const created = await repository.create(buildOs());

      const exists = await repository.existsByNumero(created.numero);
      expect(exists).toBe(true);
    });

    it('should return false when numero does not exist', async () => {
      const exists = await repository.existsByNumero('OS-INEXISTENTE-000');
      expect(exists).toBe(false);
    });
  });

  describe('update', () => {
    it('should persist status transition', async () => {
      const os = await repository.create(buildOs());

      os.atribuirMecanico(usuarioId);
      const updated = await repository.update(os);

      expect(updated.status).toBe(StatusOS.EM_DIAGNOSTICO);
      expect(updated.usuarioId).toBe(usuarioId);

      const fromDb = await repository.findById(os.id!);
      expect(fromDb!.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it('should persist diagnostico and status AGUARDANDO_APROVACAO', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      await repository.update(os);

      os.completarDiagnostico('Pastilhas de freio desgastadas e correia dentada solta');
      const updated = await repository.update(os);

      expect(updated.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
      expect(updated.diagnostico).toBeTruthy();
    });

    it('should persist itensServico via createMany on update', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 2, 150));
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(1);
      expect(updated.itensServico[0].servicoId).toBe(servicoId);
      expect(updated.valorTotalServicos()).toBe(300);
    });

    it('should replace itensServico on each update (deleteMany + createMany)', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      os.removerServico(servicoId);
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(0);
    });

    it('should persist empty itensServico without calling createMany', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete an OrdemDeServico', async () => {
      const os = await repository.create(buildOs());

      await repository.delete(os.id!);

      const found = await repository.findById(os.id!);
      expect(found).toBeNull();
    });

    it('should also cascade-delete itensServico', async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      await repository.delete(os.id!);

      const itens = await prisma.itemOrdemDeServicoServico.findMany({
        where: { ordemDeServicoId: os.id },
      });
      expect(itens).toHaveLength(0);
    });
  });

  describe('full state machine via repository', () => {
    it('should persist the complete approval lifecycle', async () => {
      const os = await repository.create(buildOs());
      expect(os.status).toBe(StatusOS.RECEBIDA);

      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      os.completarDiagnostico('Pastilhas de freio desgastadas, necessario troca imediata');
      await repository.update(os);

      os.aprovar();
      await repository.update(os);

      os.finalizarExecucao();
      await repository.update(os);

      os.entregar();
      const final = await repository.update(os);

      expect(final.status).toBe(StatusOS.ENTREGUE);

      const fromDb = await repository.findById(os.id!);
      expect(fromDb!.status).toBe(StatusOS.ENTREGUE);
    });

    it('should persist the rejection lifecycle', async () => {
      const os = await repository.create(buildOs());

      os.atribuirMecanico(usuarioId);
      await repository.update(os);

      os.completarDiagnostico('Motor com desgaste excessivo, custo muito alto');
      await repository.update(os);

      os.rejeitar();
      const final = await repository.update(os);

      expect(final.status).toBe(StatusOS.CANCELADA);
    });
  });
});
