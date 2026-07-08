import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaOrdemDeServicoRepository } from "./prisma-ordem-de-servico.repository";
import { OrdemDeServico } from "../domain/ordem-de-servico.entity";
import { StatusOS } from "../domain/value-objects/status-os.vo";
import { ItemServicoOS } from "../domain/value-objects/item-servico-os.vo";
import { ItemProdutoOS } from "../domain/value-objects/item-produto-os.vo";
import {
  startTestDatabase,
  stopTestDatabase,
} from "../../test/database.container";

jest.setTimeout(60000);

describe("PrismaOrdemDeServicoRepository (integration)", () => {
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
    repository = module.get<PrismaOrdemDeServicoRepository>(
      PrismaOrdemDeServicoRepository,
    );

    await prisma.onModuleInit();

    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.servico.deleteMany();
    await prisma.usuario.deleteMany();

    const usuario = await prisma.usuario.create({
      data: {
        nome: "Mecanico Teste",
        email: "mecanico.os.repo@oficina.com",
        senhaHash: "$2b$10$hashed",
        role: "MECANICO",
        ativo: true,
      },
    });
    usuarioId = usuario.id;

    const cliente = await prisma.cliente.create({
      data: {
        nome: "Cliente Teste",
        cpfCnpj: "52998224725",
        telefone: "11999990000",
        email: "cliente@test.com",
      },
    });
    clienteId = cliente.id;

    const veiculo = await prisma.veiculo.create({
      data: {
        placa: "ABC1D23",
        marca: "Toyota",
        modelo: "Corolla",
        ano: 2024,
        clienteId,
        ativo: true,
      },
    });
    veiculoId = veiculo.id;

    const servico = await prisma.servico.create({
      data: {
        nome: "Troca de oleo",
        precoBase: 150.0,
        tempoEstimadoHoras: 1,
        ativo: true,
      },
    });
    servicoId = servico.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
    await stopTestDatabase();
  });

  const clearOrdens = async () => {
    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
  };

  beforeEach(async () => {
    await clearOrdens();
  });

  const buildOs = (
    overrides: Partial<Parameters<typeof OrdemDeServico.create>[0]> = {},
  ) =>
    OrdemDeServico.create({
      clienteId,
      veiculoId,
      descricaoInicial: "Cliente relata barulho ao frenar",
      ...overrides,
    });

  describe("create", () => {
    it("should persist and return an OrdemDeServico with generated id", async () => {
      const os = buildOs();
      const result = await repository.create(os);

      expect(result.id).toBeDefined();
      expect(result.clienteId).toBe(clienteId);
      expect(result.veiculoId).toBe(veiculoId);
      expect(result.status).toBe(StatusOS.RECEBIDA);
      expect(result.usuarioId).toBeNull();
      expect(result.itensServico).toHaveLength(0);
    });

    it("should generate a unique numero for each OS", async () => {
      const os1 = await repository.create(buildOs());
      const os2 = await repository.create(buildOs());

      expect(os1.numero).not.toBe(os2.numero);
    });

    it("should persist itensServico with nested produtos on create (abertura com itens)", async () => {
      const produto = await prisma.produto.create({
        data: {
          nome: "Filtro de oleo",
          precoUnitario: 30,
          quantidadeEstoque: 10,
          estoqueMinimo: 1,
        },
      });

      const os = OrdemDeServico.create({
        clienteId,
        veiculoId,
        descricaoInicial: "Abertura ja com servico e peca",
        itensServico: [
          new ItemServicoOS(servicoId, 1, 150, "PENDENTE", null, null, null, [
            new ItemProdutoOS(produto.id, 2, 30),
          ]),
        ],
      });

      const created = await repository.create(os);
      const reloaded = await repository.findById(created.id!);

      expect(reloaded).not.toBeNull();
      expect(reloaded!.itensServico).toHaveLength(1);
      expect(reloaded!.itensServico[0].servicoId).toBe(servicoId);
      expect(reloaded!.itensServico[0].produtos).toHaveLength(1);
      expect(reloaded!.itensServico[0].produtos[0].produtoId).toBe(produto.id);
      expect(reloaded!.itensServico[0].produtos[0].quantidade).toBe(2);

      // limpeza: remove a OS (cascata nos itens) e o produto criado aqui
      await clearOrdens();
      await prisma.produto.deleteMany();
    });
  });

  describe("findById", () => {
    it("should return OrdemDeServico when found", async () => {
      const created = await repository.create(buildOs());

      const found = await repository.findById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.status).toBe(StatusOS.RECEBIDA);
    });

    it("should return null when not found", async () => {
      const found = await repository.findById(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeNull();
    });

    it("should return itensServico when OS has services", async () => {
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

  describe("findAll", () => {
    beforeEach(async () => {
      for (let i = 0; i < 4; i++) {
        await repository.create(buildOs());
      }
    });

    it("should return paginated results", async () => {
      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it("should return second page", async () => {
      const result = await repository.findAll({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2);
    });

    it("should use default page and limit when not provided", async () => {
      const result = await repository.findAll({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter by clienteId", async () => {
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        clienteId,
      });

      expect(result.total).toBe(4);
      result.data.forEach((os) => expect(os.clienteId).toBe(clienteId));
    });

    it("should filter by status", async () => {
      const created = await repository.create(buildOs());
      created.atribuirMecanico(usuarioId);
      await repository.update(created);

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        status: StatusOS.EM_DIAGNOSTICO,
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.data.forEach((os) =>
        expect(os.status).toBe(StatusOS.EM_DIAGNOSTICO),
      );
    });

    it("should filter by numero", async () => {
      const created = await repository.create(buildOs());

      const result = await repository.findAll({
        page: 1,
        limit: 10,
        numero: created.numero,
      });

      expect(result.total).toBe(1);
      expect(result.data[0].numero).toBe(created.numero);
    });

    it("should exclude FINALIZADA and ENTREGUE status by default", async () => {
      // Create OS with different statuses
      const os1 = await repository.create(buildOs());
      const os2 = await repository.create(buildOs());
      const os3 = await repository.create(buildOs());

      // Move some to terminal status
      os2.atribuirMecanico(usuarioId);
      os2.completarDiagnostico("Problema identificado");
      os2.aprovar();
      os2.finalizarExecucao();
      await repository.update(os2);

      os3.atribuirMecanico(usuarioId);
      os3.completarDiagnostico("Problema identificado");
      os3.aprovar();
      os3.finalizarExecucao();
      os3.entregar();
      await repository.update(os3);

      // Default call should exclude FINALIZADA and ENTREGUE
      const result = await repository.findAll({
        page: 1,
        limit: 10,
      });

      const hasTerminalStatus = result.data.some(
        (os) =>
          os.status === StatusOS.FINALIZADA || os.status === StatusOS.ENTREGUE,
      );
      expect(hasTerminalStatus).toBe(false);
    });

    it("should include FINALIZADA and ENTREGUE when incluirEncerradas is true", async () => {
      await clearOrdens();

      // Create OS with different statuses
      const os1 = await repository.create(buildOs());
      const os2 = await repository.create(buildOs());
      const os3 = await repository.create(buildOs());

      // Move some to terminal status
      os2.atribuirMecanico(usuarioId);
      os2.completarDiagnostico("Problema identificado");
      os2.aprovar();
      os2.finalizarExecucao();
      await repository.update(os2);

      os3.atribuirMecanico(usuarioId);
      os3.completarDiagnostico("Problema identificado");
      os3.aprovar();
      os3.finalizarExecucao();
      os3.entregar();
      await repository.update(os3);

      // Call with incluirEncerradas=true should include all
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        incluirEncerradas: true,
      });

      expect(result.total).toBe(3);
    });

    it("should order by status priority within page", async () => {
      await clearOrdens();

      // Create OS with different statuses in specific order
      const osRecebida = await repository.create(buildOs());

      const osDiag = await repository.create(buildOs());
      osDiag.atribuirMecanico(usuarioId);
      await repository.update(osDiag);

      const osAguardando = await repository.create(buildOs());
      osAguardando.atribuirMecanico(usuarioId);
      osAguardando.completarDiagnostico("Problema identificado");
      await repository.update(osAguardando);

      const osExecucao = await repository.create(buildOs());
      osExecucao.atribuirMecanico(usuarioId);
      osExecucao.completarDiagnostico("Problema identificado");
      osExecucao.aprovar();
      await repository.update(osExecucao);

      // Get with incluirEncerradas to see actual ordering
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        incluirEncerradas: true,
      });

      // Should have all 4 OS
      expect(result.data).toHaveLength(4);

      // Verify order: higher priority status come first
      const statuses = result.data.map((os) => os.status);
      const statusOrder = [
        StatusOS.EM_EXECUCAO,
        StatusOS.AGUARDANDO_APROVACAO,
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.RECEBIDA,
      ];

      let lastIndex = -1;
      for (const status of statuses) {
        const currentIndex = statusOrder.indexOf(status);
        expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = currentIndex;
      }
    });

    it("should keep status-priority order ACROSS pages (not only within a page)", async () => {
      await clearOrdens();

      // Uma OS por status, criadas fora da ordem de prioridade.
      const osRecebida = await repository.create(buildOs());
      expect(osRecebida.status).toBe(StatusOS.RECEBIDA);

      const osDiag = await repository.create(buildOs());
      osDiag.atribuirMecanico(usuarioId);
      await repository.update(osDiag);

      const osAguardando = await repository.create(buildOs());
      osAguardando.atribuirMecanico(usuarioId);
      osAguardando.completarDiagnostico("Problema identificado");
      await repository.update(osAguardando);

      const osExecucao = await repository.create(buildOs());
      osExecucao.atribuirMecanico(usuarioId);
      osExecucao.completarDiagnostico("Problema identificado");
      osExecucao.aprovar();
      await repository.update(osExecucao);

      // Paginando de 2 em 2, a ordem global de prioridade deve ser respeitada.
      // Antes da correção, a página vinha de um recorte não-ordenado do banco.
      const page1 = await repository.findAll({
        page: 1,
        limit: 2,
        incluirEncerradas: true,
      });
      const page2 = await repository.findAll({
        page: 2,
        limit: 2,
        incluirEncerradas: true,
      });

      expect(page1.total).toBe(4);
      expect(page2.total).toBe(4);

      const orderedStatuses = [...page1.data, ...page2.data].map(
        (os) => os.status,
      );
      expect(orderedStatuses).toEqual([
        StatusOS.EM_EXECUCAO,
        StatusOS.AGUARDANDO_APROVACAO,
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.RECEBIDA,
      ]);
    });
  });

  describe("findByNumero", () => {
    it("should return OrdemDeServico when found by numero", async () => {
      const created = await repository.create(buildOs());

      const found = await repository.findByNumero(created.numero);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it("should return null when numero not found", async () => {
      const found = await repository.findByNumero("OS-INEXISTENTE-000");
      expect(found).toBeNull();
    });
  });

  describe("existsByNumero", () => {
    it("should return true when numero exists", async () => {
      const created = await repository.create(buildOs());

      const exists = await repository.existsByNumero(created.numero);
      expect(exists).toBe(true);
    });

    it("should return false when numero does not exist", async () => {
      const exists = await repository.existsByNumero("OS-INEXISTENTE-000");
      expect(exists).toBe(false);
    });
  });

  describe("update", () => {
    it("should persist status transition", async () => {
      const os = await repository.create(buildOs());

      os.atribuirMecanico(usuarioId);
      const updated = await repository.update(os);

      expect(updated.status).toBe(StatusOS.EM_DIAGNOSTICO);
      expect(updated.usuarioId).toBe(usuarioId);

      const fromDb = await repository.findById(os.id!);
      expect(fromDb!.status).toBe(StatusOS.EM_DIAGNOSTICO);
    });

    it("should persist diagnostico and status AGUARDANDO_APROVACAO", async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      await repository.update(os);

      os.completarDiagnostico(
        "Pastilhas de freio desgastadas e correia dentada solta",
      );
      const updated = await repository.update(os);

      expect(updated.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
      expect(updated.diagnostico).toBeTruthy();
    });

    it("should persist itensServico via createMany on update", async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 2, 150));
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(1);
      expect(updated.itensServico[0].servicoId).toBe(servicoId);
      expect(updated.valorTotalServicos()).toBe(300);
    });

    it("should replace itensServico on each update (deleteMany + createMany)", async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      os.removerServico(servicoId);
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(0);
    });

    it("should persist empty itensServico without calling createMany", async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      const updated = await repository.update(os);

      expect(updated.itensServico).toHaveLength(0);
    });
  });

  describe("delete", () => {
    it("should delete an OrdemDeServico", async () => {
      const os = await repository.create(buildOs());

      await repository.delete(os.id!);

      const found = await repository.findById(os.id!);
      expect(found).toBeNull();
    });

    it("should also cascade-delete itensServico", async () => {
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

  describe("full state machine via repository", () => {
    it("should persist the complete approval lifecycle", async () => {
      const os = await repository.create(buildOs());
      expect(os.status).toBe(StatusOS.RECEBIDA);

      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      os.completarDiagnostico(
        "Pastilhas de freio desgastadas, necessario troca imediata",
      );
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

    it("should persist the rejection lifecycle", async () => {
      const os = await repository.create(buildOs());

      os.atribuirMecanico(usuarioId);
      await repository.update(os);

      os.completarDiagnostico("Motor com desgaste excessivo, custo muito alto");
      await repository.update(os);

      os.rejeitar();
      const final = await repository.update(os);

      expect(final.status).toBe(StatusOS.CANCELADA);
    });
  });

  describe("execucao de servicos (US-14)", () => {
    const advanceToEmExecucao = async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);
      os.completarDiagnostico("Correia dentada com desgaste, oleo vencido");
      await repository.update(os);
      os.aprovar();
      await repository.update(os);
      return os;
    };

    it("should persist statusExecucao=PENDENTE on new items", async () => {
      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      await repository.update(os);

      const found = await repository.findById(os.id!);
      expect(found!.itensServico[0].statusExecucao).toBe("PENDENTE");
      expect(found!.itensServico[0].inicioExecucao).toBeNull();
      expect(found!.itensServico[0].fimExecucao).toBeNull();
      expect(found!.itensServico[0].horasTrabalhadas).toBeNull();
    });

    it("should persist inicioExecucao when service is started", async () => {
      const os = await advanceToEmExecucao();

      os.iniciarServico(servicoId);
      await repository.update(os);

      const found = await repository.findById(os.id!);
      expect(found!.itensServico[0].statusExecucao).toBe("EM_EXECUCAO");
      expect(found!.itensServico[0].inicioExecucao).toBeInstanceOf(Date);
      expect(found!.itensServico[0].fimExecucao).toBeNull();
    });

    it("should persist fimExecucao and horasTrabalhadas when service is concluded", async () => {
      const os = await advanceToEmExecucao();

      os.iniciarServico(servicoId);
      await repository.update(os);

      os.concluirServico(servicoId, 2.5);
      await repository.update(os);

      const found = await repository.findById(os.id!);
      const item = found!.itensServico[0];

      expect(item.statusExecucao).toBe("CONCLUIDO");
      expect(item.fimExecucao).toBeInstanceOf(Date);
      expect(item.horasTrabalhadas).toBe(2.5);
      expect(item.inicioExecucao).toBeInstanceOf(Date);
    });

    it("should auto-finalize OS when all services are concluded", async () => {
      const os = await advanceToEmExecucao();

      os.iniciarServico(servicoId);
      await repository.update(os);

      os.concluirServico(servicoId, 1);
      const final = await repository.update(os);

      expect(final.status).toBe(StatusOS.FINALIZADA);

      const fromDb = await repository.findById(os.id!);
      expect(fromDb!.status).toBe(StatusOS.FINALIZADA);
    });

    it("should persist complete execution lifecycle with two services", async () => {
      let servicoId2: string;
      const servico2 = await prisma.servico.create({
        data: {
          nome: "Alinhamento",
          precoBase: 80.0,
          tempoEstimadoHoras: 0.5,
          ativo: true,
        },
      });
      servicoId2 = servico2.id;

      const os = await repository.create(buildOs());
      os.atribuirMecanico(usuarioId);
      os.adicionarServico(new ItemServicoOS(servicoId, 1, 150));
      os.adicionarServico(new ItemServicoOS(servicoId2, 1, 80));
      await repository.update(os);
      os.completarDiagnostico("Oleo e alinhamento necessarios");
      await repository.update(os);
      os.aprovar();
      await repository.update(os);

      os.iniciarServico(servicoId);
      await repository.update(os);

      os.iniciarServico(servicoId2);
      await repository.update(os);

      os.concluirServico(servicoId, 1.5);
      const afterFirst = await repository.update(os);
      expect(afterFirst.status).toBe(StatusOS.EM_EXECUCAO);

      os.concluirServico(servicoId2, 0.5);
      const afterSecond = await repository.update(os);
      expect(afterSecond.status).toBe(StatusOS.FINALIZADA);

      const fromDb = await repository.findById(os.id!);
      expect(
        fromDb!.itensServico.every((i) => i.statusExecucao === "CONCLUIDO"),
      ).toBe(true);
      expect(
        fromDb!.itensServico.find((i) => i.servicoId === servicoId)!
          .horasTrabalhadas,
      ).toBe(1.5);
      expect(
        fromDb!.itensServico.find((i) => i.servicoId === servicoId2)!
          .horasTrabalhadas,
      ).toBe(0.5);

      await prisma.itemOrdemDeServicoServico.deleteMany();
      await prisma.ordemDeServico.deleteMany();
      await prisma.servico.delete({ where: { id: servicoId2 } });
    });

    it("should reconstruct execution fields correctly after findByNumero", async () => {
      const os = await advanceToEmExecucao();
      os.iniciarServico(servicoId);
      await repository.update(os);
      os.concluirServico(servicoId, 3);
      await repository.update(os);

      const found = await repository.findByNumero(os.numero);
      expect(found).not.toBeNull();
      expect(found!.itensServico[0].statusExecucao).toBe("CONCLUIDO");
      expect(found!.itensServico[0].horasTrabalhadas).toBe(3);
    });
  });
});
