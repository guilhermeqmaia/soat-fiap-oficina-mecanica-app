import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaUsuarioRepository } from "./prisma-usuario.repository";
import { Usuario } from "../domain/usuario.entity";
import { Role } from '@guilhermeqmaia/oficina-kit/auth';
import {
  startTestDatabase,
  stopTestDatabase,
} from "../../test/database.container";

jest.setTimeout(60000);

describe("PrismaUsuarioRepository (integration)", () => {
  let repository: PrismaUsuarioRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaUsuarioRepository],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<PrismaUsuarioRepository>(PrismaUsuarioRepository);

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.usuario.deleteMany();
  });

  describe("create", () => {
    it("should persist and return a Usuario with generated id", async () => {
      const usuario = Usuario.create({
        nome: "Joao Silva",
        email: "joao@oficina.com",
        senhaHash: "$2b$10$hashed",
        role: Role.ATENDENTE,
      });

      const result = await repository.create(usuario);

      expect(result.id).toBeDefined();
      expect(result.nome).toBe("Joao Silva");
      expect(result.email.value).toBe("joao@oficina.com");
      expect(result.role).toBe(Role.ATENDENTE);
      expect(result.ativo).toBe(true);
    });

    it("should normalize email to lowercase on persist", async () => {
      const usuario = Usuario.create({
        nome: "Test",
        email: "USER@OFICINA.COM",
        senhaHash: "$2b$10$hashed",
        role: Role.ADMIN,
      });

      const result = await repository.create(usuario);
      expect(result.email.value).toBe("user@oficina.com");
    });
  });

  describe("findByEmail", () => {
    it("should find a Usuario by email", async () => {
      await repository.create(
        Usuario.create({
          nome: "Maria",
          email: "maria@oficina.com",
          senhaHash: "$2b$10$h",
          role: Role.ADMIN,
        }),
      );

      const found = await repository.findByEmail("maria@oficina.com");
      expect(found).not.toBeNull();
      expect(found!.role).toBe(Role.ADMIN);
    });

    it("should be case-insensitive", async () => {
      await repository.create(
        Usuario.create({
          nome: "Maria",
          email: "maria@oficina.com",
          senhaHash: "$2b$10$h",
          role: Role.ADMIN,
        }),
      );

      const found = await repository.findByEmail("MARIA@OFICINA.COM");
      expect(found).not.toBeNull();
    });

    it("should return null when not found", async () => {
      const found = await repository.findByEmail("inexistente@oficina.com");
      expect(found).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find a Usuario by id", async () => {
      const created = await repository.create(
        Usuario.create({
          nome: "Carlos",
          email: "carlos@oficina.com",
          senhaHash: "$2b$10$h",
          role: Role.MECANICO,
        }),
      );

      const found = await repository.findById(created.id!);
      expect(found).not.toBeNull();
      expect(found!.nome).toBe("Carlos");
    });

    it("should return null when not found", async () => {
      const found = await repository.findById(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeNull();
    });
  });

  describe("role persistence", () => {
    it("should persist all role types correctly", async () => {
      const roles = [
        Role.ADMIN,
        Role.ATENDENTE,
        Role.MECANICO,
        Role.ESTOQUISTA,
        Role.CLIENTE,
      ];

      for (const role of roles) {
        const usuario = Usuario.create({
          nome: `User ${role}`,
          email: `${role.toLowerCase()}@oficina.com`,
          senhaHash: "$2b$10$h",
          role,
        });
        const result = await repository.create(usuario);
        expect(result.role).toBe(role);
      }
    });
  });
});
