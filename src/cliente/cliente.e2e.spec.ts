import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcrypt";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../auth/domain/role.enum";
import {
  startTestDatabase,
  stopTestDatabase,
} from "../test/database.container";

jest.setTimeout(120000);

describe("Cliente (e2e) — US-02", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = "test-secret";

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.usuario.deleteMany();

    const senhaHash = await bcrypt.hash("admin123", 10);
    await prisma.usuario.create({
      data: {
        nome: "Admin",
        email: "admin.us02@oficina.com",
        senhaHash,
        role: Role.ADMIN,
        ativo: true,
      },
    });

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin.us02@oficina.com", senha: "admin123" });
    adminToken = loginRes.body.accessToken;
    expect(adminToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
  });

  const createCliente = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app.getHttpServer())
      .post("/clientes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nome: "Joao Silva",
        cpfCnpj: "529.982.247-25",
        telefone: "11999998888",
        ...overrides,
      });
    expect(res.status).toBe(201);
    return res.body;
  };

  describe("GET /clientes/documento/:cpfCnpj", () => {
    it("finds cliente by CPF in plain digits", async () => {
      const cliente = await createCliente();

      const res = await request(app.getHttpServer())
        .get("/clientes/documento/52998224725")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(cliente.id);
      expect(res.body.cpfCnpj).toBe("52998224725");
    });

    it("finds cliente by CPF with mask", async () => {
      await createCliente();

      const res = await request(app.getHttpServer())
        .get("/clientes/documento/529.982.247-25")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("finds cliente by CNPJ (URL-encoded slash or digits-only)", async () => {
      await createCliente({ cpfCnpj: "11.222.333/0001-81" });

      // Plain digits (recommended for callers that may have trouble escaping "/")
      const digitsRes = await request(app.getHttpServer())
        .get("/clientes/documento/11222333000181")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(digitsRes.status).toBe(200);
      expect(digitsRes.body.cpfCnpj).toBe("11222333000181");

      // URL-encoded mask
      const encodedRes = await request(app.getHttpServer())
        .get(
          `/clientes/documento/${encodeURIComponent("11.222.333/0001-81")}`,
        )
        .set("Authorization", `Bearer ${adminToken}`);
      expect(encodedRes.status).toBe(200);
    });

    it("returns 404 when not found", async () => {
      const res = await request(app.getHttpServer())
        .get("/clientes/documento/52998224725")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it("returns 400 when digits count is invalid", async () => {
      const res = await request(app.getHttpServer())
        .get("/clientes/documento/12345")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it("requires authentication", async () => {
      const res = await request(app.getHttpServer()).get(
        "/clientes/documento/52998224725",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /clientes/:id (soft delete)", () => {
    it("marks cliente as ativo=false instead of removing", async () => {
      const cliente = await createCliente();

      const deleteRes = await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(204);

      // Row should still exist in the database
      const row = await prisma.cliente.findUnique({ where: { id: cliente.id } });
      expect(row).not.toBeNull();
      expect(row!.ativo).toBe(false);
    });

    it("hides inactive clientes from the default list", async () => {
      const c1 = await createCliente();
      const c2 = await createCliente({
        cpfCnpj: "11144477735",
        nome: "Maria",
      });

      // Soft-delete c1
      await request(app.getHttpServer())
        .delete(`/clientes/${c1.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const listRes = await request(app.getHttpServer())
        .get("/clientes")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.data[0].id).toBe(c2.id);
    });

    it("still allows direct lookup by id even if inactive", async () => {
      const cliente = await createCliente();

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const getRes = await request(app.getHttpServer())
        .get(`/clientes/${cliente.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.ativo).toBe(false);
    });

    it("does not allow re-registering with the same CPF after soft delete", async () => {
      // Rationale: CPF is unique in the DB regardless of ativo flag
      const cliente = await createCliente();

      await request(app.getHttpServer())
        .delete(`/clientes/${cliente.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      const dupRes = await request(app.getHttpServer())
        .post("/clientes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nome: "Outro",
          cpfCnpj: "52998224725",
          telefone: "11000000000",
        });

      expect(dupRes.status).toBe(409);
    });
  });
});
