import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaClienteRepository } from "./prisma-cliente.repository";
import { Cliente } from "../domain/cliente.entity";
import {
  startTestDatabase,
  stopTestDatabase,
} from "../../test/database.container";

jest.setTimeout(60000);

describe("PrismaClienteRepository (integration)", () => {
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
    await prisma.veiculo.deleteMany();
    await prisma.cliente.deleteMany();
  });

  describe("create", () => {
    it("persists Cliente with ativo=true by default", async () => {
      const cliente = Cliente.create({
        nome: "Joao Silva",
        cpfCnpj: "529.982.247-25",
        telefone: "11999998888",
        email: "joao@email.com",
      });

      const result = await repository.create(cliente);

      expect(result.id).toBeDefined();
      expect(result.nome).toBe("Joao Silva");
      expect(result.cpfCnpj.value).toBe("52998224725");
      expect(result.ativo).toBe(true);
    });
  });

  describe("findByCpfCnpj", () => {
    it("finds a cliente by normalized CPF", async () => {
      await repository.create(
        Cliente.create({
          nome: "Joao Silva",
          cpfCnpj: "52998224725",
          telefone: "11999998888",
        }),
      );

      const found = await repository.findByCpfCnpj("52998224725");
      expect(found).not.toBeNull();
      expect(found!.nome).toBe("Joao Silva");
    });

    it("finds a cliente by formatted CPF", async () => {
      await repository.create(
        Cliente.create({
          nome: "Joao Silva",
          cpfCnpj: "52998224725",
          telefone: "11999998888",
        }),
      );

      const found = await repository.findByCpfCnpj("529.982.247-25");
      expect(found).not.toBeNull();
    });

    it("finds a cliente by formatted CNPJ", async () => {
      await repository.create(
        Cliente.create({
          nome: "Empresa XYZ",
          cpfCnpj: "11222333000181",
          telefone: "11999998888",
        }),
      );

      const found = await repository.findByCpfCnpj("11.222.333/0001-81");
      expect(found).not.toBeNull();
      expect(found!.cpfCnpj.isCnpj).toBe(true);
    });

    it("returns null when not found", async () => {
      expect(await repository.findByCpfCnpj("52998224725")).toBeNull();
    });
  });

  describe("findAll — soft delete filtering", () => {
    beforeEach(async () => {
      const ativo1 = Cliente.create({
        nome: "Ativo Um",
        cpfCnpj: "52998224725",
        telefone: "11999998888",
      });
      const ativo2 = Cliente.create({
        nome: "Ativo Dois",
        cpfCnpj: "11144477735",
        telefone: "11999998888",
      });
      const inativo = Cliente.create({
        nome: "Inativo",
        cpfCnpj: "60739788558",
        telefone: "11999998888",
      });
      inativo.deactivate();

      await repository.create(ativo1);
      await repository.create(ativo2);
      await repository.create(inativo);
    });

    it("returns only active clientes by default", async () => {
      const result = await repository.findAll({ page: 1, limit: 10 });
      expect(result.total).toBe(2);
      expect(result.data.every((c) => c.ativo)).toBe(true);
    });

    it("includes inactive when incluirInativos=true", async () => {
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        incluirInativos: true,
      });
      expect(result.total).toBe(3);
    });

    it("applies nome filter combined with active filter", async () => {
      const result = await repository.findAll({
        page: 1,
        limit: 10,
        nome: "ativo",
      });
      // case-insensitive match for "Ativo Um" and "Ativo Dois" (both active).
      // "Inativo" also matches "ativo" but is filtered by ativo=true.
      expect(result.total).toBe(2);
      expect(result.data.map((c) => c.nome).sort()).toEqual([
        "Ativo Dois",
        "Ativo Um",
      ]);
    });
  });

  describe("update — soft delete", () => {
    it("persists deactivate as ativo=false", async () => {
      const created = await repository.create(
        Cliente.create({
          nome: "Joao",
          cpfCnpj: "52998224725",
          telefone: "11999998888",
        }),
      );

      created.deactivate();
      const updated = await repository.update(created);

      expect(updated.ativo).toBe(false);

      const fromDb = await repository.findById(created.id!);
      expect(fromDb!.ativo).toBe(false);
    });
  });

  describe("existsByCpfCnpj", () => {
    it("accepts formatted and unformatted inputs equivalently", async () => {
      await repository.create(
        Cliente.create({
          nome: "Joao",
          cpfCnpj: "52998224725",
          telefone: "11999998888",
        }),
      );

      expect(await repository.existsByCpfCnpj("52998224725")).toBe(true);
      expect(await repository.existsByCpfCnpj("529.982.247-25")).toBe(true);
      expect(await repository.existsByCpfCnpj("11144477735")).toBe(false);
    });
  });
});
