import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcrypt";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../auth/domain/role.enum";
import { StatusOS } from "./domain/value-objects/status-os.vo";
import {
  startTestDatabase,
  stopTestDatabase,
} from "../test/database.container";

jest.setTimeout(120000);

interface TestUser {
  nome: string;
  email: string;
  senha: string;
  role: Role;
}

const USERS: Record<string, TestUser> = {
  admin: {
    nome: "Admin",
    email: "admin.os@oficina.com",
    senha: "admin123",
    role: Role.ADMIN,
  },
  atendente: {
    nome: "Atendente",
    email: "atendente.os@oficina.com",
    senha: "atend123",
    role: Role.ATENDENTE,
  },
  mecanico: {
    nome: "Mecanico",
    email: "mecanico.os@oficina.com",
    senha: "mec123",
    role: Role.MECANICO,
  },
  estoquista: {
    nome: "Estoquista",
    email: "estoquista.os@oficina.com",
    senha: "estq123",
    role: Role.ESTOQUISTA,
  },
  cliente: {
    nome: "Cliente",
    email: "cliente.os@oficina.com",
    senha: "cli123",
    role: Role.CLIENTE,
  },
};

describe("OrdemDeServico (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  let clienteId: string;
  let veiculoId: string;
  let servicoId: string;
  let mecanicoUserId: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = "test-secret";

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.itemOrdemDeServicoServico.deleteMany();
    await prisma.ordemDeServico.deleteMany();
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.servico.deleteMany();
    await prisma.usuario.deleteMany();

    for (const user of Object.values(USERS)) {
      const senhaHash = await bcrypt.hash(user.senha, 10);
      const created = await prisma.usuario.create({
        data: {
          nome: user.nome,
          email: user.email,
          senhaHash,
          role: user.role,
          ativo: true,
        },
      });
      userIds[user.role] = created.id;
    }
    mecanicoUserId = userIds[Role.MECANICO];

    for (const [key, user] of Object.entries(USERS)) {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: user.email, senha: user.senha });
      expect(res.status).toBe(200);
      tokens[key] = res.body.accessToken;
    }

    const clienteRes = await request(app.getHttpServer())
      .post("/clientes")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({
        nome: "Joao Silva",
        cpfCnpj: "529.982.247-25",
        telefone: "11999990000",
        email: USERS.cliente.email,
      });
    expect(clienteRes.status).toBe(201);
    clienteId = clienteRes.body.id;

    const veiculoRes = await request(app.getHttpServer())
      .post("/veiculos")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({
        placa: "TES1T23",
        marca: "Toyota",
        modelo: "Corolla",
        ano: 2024,
        clienteId,
      });
    expect(veiculoRes.status).toBe(201);
    veiculoId = veiculoRes.body.id;

    const servicoRes = await request(app.getHttpServer())
      .post("/servicos")
      .set("Authorization", `Bearer ${tokens.admin}`)
      .send({
        nome: "Troca de pastilha",
        precoBase: 200,
        tempoEstimadoHoras: 1,
      });
    expect(servicoRes.status).toBe(201);
    servicoId = servicoRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  // ─── Helper ────────────────────────────────────────────────────────────────

  const createOs = async (token = tokens.admin) => {
    const res = await request(app.getHttpServer())
      .post("/ordens-servico")
      .set("Authorization", `Bearer ${token}`)
      .send({
        clienteId,
        veiculoId,
        descricaoInicial: "Cliente relata barulho ao frenar",
      });
    expect(res.status).toBe(201);
    return res.body as { id: string; status: string; numero: string };
  };

  // ─── POST /ordens-servico ──────────────────────────────────────────────────

  describe("POST /ordens-servico", () => {
    it("should create OS with status RECEBIDA", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ clienteId, veiculoId, descricaoInicial: "Barulho ao frear" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.RECEBIDA);
      expect(res.body.numero).toMatch(/^OS-/);
      expect(res.body.clienteId).toBe(clienteId);
      expect(res.body.veiculoId).toBe(veiculoId);
      expect(res.body.usuarioId).toBeNull();
    });

    it("should return 404 when cliente does not exist", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          clienteId: "00000000-0000-0000-0000-000000000000",
          veiculoId,
          descricaoInicial: "Teste",
        });

      expect(res.status).toBe(404);
    });

    it("should return 404 when veiculo does not exist", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          clienteId,
          veiculoId: "00000000-0000-0000-0000-000000000000",
          descricaoInicial: "Teste",
        });

      expect(res.status).toBe(404);
    });

    it("should return 409 when veiculo does not belong to cliente", async () => {
      const outroCliente = await request(app.getHttpServer())
        .post("/clientes")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          nome: "Outro Cliente",
          cpfCnpj: "836.076.971-08",
          telefone: "11000000001",
        });
      expect(outroCliente.status).toBe(201);

      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          clienteId: outroCliente.body.id,
          veiculoId,
          descricaoInicial: "Veiculo de outro cliente",
        });

      expect(res.status).toBe(409);
    });

    it("should return 400 for short descricaoInicial", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ clienteId, veiculoId, descricaoInicial: "ab" });

      expect(res.status).toBe(400);
    });

    it("should return 401 without token", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .send({ clienteId, veiculoId, descricaoInicial: "Teste" });

      expect(res.status).toBe(401);
    });

    it("should return 403 for CLIENTE role", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.cliente}`)
        .send({ clienteId, veiculoId, descricaoInicial: "Teste" });

      expect(res.status).toBe(403);
    });

    it("should return 403 for MECANICO role", async () => {
      const res = await request(app.getHttpServer())
        .post("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.mecanico}`)
        .send({ clienteId, veiculoId, descricaoInicial: "Teste" });

      expect(res.status).toBe(403);
    });
  });

  // ─── GET /ordens-servico ───────────────────────────────────────────────────

  describe("GET /ordens-servico", () => {
    it("should return paginated list", async () => {
      const res = await request(app.getHttpServer())
        .get("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("should filter by clienteId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/ordens-servico?clienteId=${clienteId}`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((os: any) => expect(os.clienteId).toBe(clienteId));
    });

    it("should filter by status", async () => {
      const res = await request(app.getHttpServer())
        .get(`/ordens-servico?status=${StatusOS.RECEBIDA}`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((os: any) =>
        expect(os.status).toBe(StatusOS.RECEBIDA),
      );
    });

    it("should deny CLIENTE role", async () => {
      const res = await request(app.getHttpServer())
        .get("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.cliente}`);
      expect(res.status).toBe(403);
    });

    it("should allow MECANICO role", async () => {
      const res = await request(app.getHttpServer())
        .get("/ordens-servico")
        .set("Authorization", `Bearer ${tokens.mecanico}`);
      expect(res.status).toBe(200);
    });
  });

  // ─── GET /ordens-servico/:id ───────────────────────────────────────────────

  describe("GET /ordens-servico/:id", () => {
    it("should return OS by id", async () => {
      const os = await createOs();

      const res = await request(app.getHttpServer())
        .get(`/ordens-servico/${os.id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(200);
      expect(res.body.cabecalho).toBeDefined();
      expect(res.body.cabecalho.dadosCliente.id).toBe(clienteId);
    });

    it("should deny CLIENTE role", async () => {
      const os = await createOs();

      const res = await request(app.getHttpServer())
        .get(`/ordens-servico/${os.id}`)
        .set("Authorization", `Bearer ${tokens.cliente}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── Full lifecycle — approval path ───────────────────────────────────────

  describe("Full lifecycle — approval path (RECEBIDA → ENTREGUE)", () => {
    let osId: string;

    it("1. creates OS with status RECEBIDA", async () => {
      const os = await createOs(tokens.atendente);
      osId = os.id;
      expect(os.status).toBe(StatusOS.RECEBIDA);
    });

    it("2. assigns mechanic → EM_DIAGNOSTICO", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.mecanico}`)
        .send({ usuarioId: mecanicoUserId });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.EM_DIAGNOSTICO);
      expect(res.body.usuarioId).toBe(mecanicoUserId);
    });

    it("3. adds service from catalog", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.mecanico}`)
        .send({ servicoId, quantidade: 2 });

      expect(res.status).toBe(201);
      expect(res.body.itensServico).toHaveLength(1);
      expect(res.body.itensServico[0].servicoId).toBe(servicoId);
      expect(res.body.itensServico[0].quantidade).toBe(2);
      expect(res.body.valorTotalServicos).toBe(400);
    });

    it("4. completes diagnosis → AGUARDANDO_APROVACAO", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/completar-diagnostico`)
        .set("Authorization", `Bearer ${tokens.mecanico}`)
        .send({
          diagnostico:
            "Pastilhas de freio totalmente desgastadas, troca urgente",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
      expect(res.body.diagnostico).toBeTruthy();
    });

    it("5. client approves budget → EM_EXECUCAO", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/aprovar-orcamento`)
        .set("Authorization", `Bearer ${tokens.cliente}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.EM_EXECUCAO);
    });

    it("6. mechanic finalizes execution → FINALIZADA", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/finalizar-execucao`)
        .set("Authorization", `Bearer ${tokens.mecanico}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.FINALIZADA);
    });

    it("7. attendant delivers vehicle → ENTREGUE", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/entregar`)
        .set("Authorization", `Bearer ${tokens.atendente}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.ENTREGUE);
    });
  });

  // ─── Full lifecycle — rejection path ──────────────────────────────────────

  describe("Full lifecycle — rejection path (AGUARDANDO_APROVACAO → CANCELADA)", () => {
    let osId: string;

    it("1. creates OS and progresses to AGUARDANDO_APROVACAO", async () => {
      const os = await createOs();
      osId = os.id;

      await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ usuarioId: mecanicoUserId });

      const diagRes = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/completar-diagnostico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          diagnostico: "Motor com desgaste severo, reparo muito custoso",
        });

      expect(diagRes.status).toBe(201);
      expect(diagRes.body.status).toBe(StatusOS.AGUARDANDO_APROVACAO);
    });

    it("2. client rejects budget → CANCELADA", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/rejeitar-orcamento`)
        .set("Authorization", `Bearer ${tokens.cliente}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(StatusOS.CANCELADA);
    });

    it("3. cannot transition from CANCELADA", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ usuarioId: mecanicoUserId });

      expect(res.status).toBe(400);
    });
  });

  // ─── Service management on OS ─────────────────────────────────────────────

  describe("Service management on OS", () => {
    let osId: string;

    beforeEach(async () => {
      const os = await createOs();
      osId = os.id;
      await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ usuarioId: mecanicoUserId });
    });

    it("should add a service and reflect in valorTotalServicos", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ servicoId, quantidade: 1 });

      expect(res.status).toBe(201);
      expect(res.body.itensServico).toHaveLength(1);
      expect(res.body.valorTotalServicos).toBeGreaterThan(0);
    });

    it("should return 409 when adding the same service twice", async () => {
      await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ servicoId, quantidade: 1 });

      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ servicoId, quantidade: 1 });

      expect(res.status).toBe(409);
    });

    it("should return 404 when adding a non-existent service", async () => {
      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({
          servicoId: "00000000-0000-0000-0000-000000000000",
          quantidade: 1,
        });

      expect(res.status).toBe(404);
    });

    it("should remove an added service", async () => {
      await request(app.getHttpServer())
        .post(`/ordens-servico/${osId}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ servicoId, quantidade: 1 });

      const res = await request(app.getHttpServer())
        .delete(`/ordens-servico/${osId}/servicos/${servicoId}`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(204);

      const osRes = await request(app.getHttpServer())
        .get(`/ordens-servico/${osId}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(osRes.body.corpo.servicos).toHaveLength(0);
    });

    it("should return 404 when removing a service not in OS", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/ordens-servico/${osId}/servicos/${servicoId}`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(404);
    });

    it("should not allow adding services when OS is not EM_DIAGNOSTICO", async () => {
      const os = await createOs();

      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/servicos`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ servicoId, quantidade: 1 });

      expect(res.status).toBe(400);
    });
  });

  // ─── RBAC for OS-specific transitions ─────────────────────────────────────

  describe("RBAC — transition endpoints", () => {
    it("POST atribuir-mecanico: only ADMIN and MECANICO allowed", async () => {
      const os = await createOs();

      for (const role of ["admin", "mecanico"]) {
        const freshOs = await createOs();
        const res = await request(app.getHttpServer())
          .post(`/ordens-servico/${freshOs.id}/atribuir-mecanico`)
          .set("Authorization", `Bearer ${tokens[role]}`)
          .send({ usuarioId: mecanicoUserId });
        expect(res.status).not.toBe(403);
        expect(res.status).not.toBe(401);
      }

      for (const role of ["atendente", "estoquista", "cliente"]) {
        const res = await request(app.getHttpServer())
          .post(`/ordens-servico/${os.id}/atribuir-mecanico`)
          .set("Authorization", `Bearer ${tokens[role]}`)
          .send({ usuarioId: mecanicoUserId });
        expect(res.status).toBe(403);
      }
    });

    it("POST completar-diagnostico: only ADMIN and MECANICO allowed", async () => {
      const os = await createOs();
      await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ usuarioId: mecanicoUserId });

      for (const role of ["atendente", "estoquista", "cliente"]) {
        const res = await request(app.getHttpServer())
          .post(`/ordens-servico/${os.id}/completar-diagnostico`)
          .set("Authorization", `Bearer ${tokens[role]}`)
          .send({ diagnostico: "Diagnostico teste para rbac" });
        expect(res.status).toBe(403);
      }
    });

    it("POST entregar: only ADMIN and ATENDENTE allowed", async () => {
      for (const role of ["mecanico", "estoquista", "cliente"]) {
        const res = await request(app.getHttpServer())
          .post(`/ordens-servico/00000000-0000-0000-0000-000000000000/entregar`)
          .set("Authorization", `Bearer ${tokens[role]}`);
        expect(res.status).toBe(403);
      }
    });

    it("DELETE /ordens-servico/:id: only ADMIN allowed", async () => {
      const os = await createOs();

      for (const role of ["atendente", "mecanico", "estoquista", "cliente"]) {
        const res = await request(app.getHttpServer())
          .delete(`/ordens-servico/${os.id}`)
          .set("Authorization", `Bearer ${tokens[role]}`);
        expect(res.status).toBe(403);
      }

      const res = await request(app.getHttpServer())
        .delete(`/ordens-servico/${os.id}`)
        .set("Authorization", `Bearer ${tokens.admin}`);
      expect(res.status).toBe(204);
    });
  });

  // ─── Invalid state transitions ────────────────────────────────────────────

  describe("Invalid state transitions", () => {
    it("should return 400 when completing diagnosis on RECEBIDA OS", async () => {
      const os = await createOs();

      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/completar-diagnostico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ diagnostico: "Diagnostico sem atribuicao de mecanico" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when approving budget on RECEBIDA OS", async () => {
      const os = await createOs();

      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/aprovar-orcamento`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(400);
    });

    it("should return 400 when finalizing execution on EM_DIAGNOSTICO OS", async () => {
      const os = await createOs();
      await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/atribuir-mecanico`)
        .set("Authorization", `Bearer ${tokens.admin}`)
        .send({ usuarioId: mecanicoUserId });

      const res = await request(app.getHttpServer())
        .post(`/ordens-servico/${os.id}/finalizar-execucao`)
        .set("Authorization", `Bearer ${tokens.admin}`);

      expect(res.status).toBe(400);
    });
  });
});
