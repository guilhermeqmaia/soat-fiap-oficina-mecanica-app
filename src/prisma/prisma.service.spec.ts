import { PrismaService } from "./prisma.service";

// Mock the entire generated Prisma client to avoid needing a real database
jest.mock("../generated/prisma/client", () => {
  return {
    PrismaClient: class MockPrismaClient {
      $connect = jest.fn().mockResolvedValue(undefined);
      $disconnect = jest.fn().mockResolvedValue(undefined);
    },
  };
});

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    service = new PrismaService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("conecta sem TLS por padrao (local/kind)", () => {
    const { PrismaPg } = jest.requireMock("@prisma/adapter-pg");
    delete process.env.DB_SSL;
    new PrismaService();
    expect(PrismaPg).toHaveBeenLastCalledWith(
      expect.objectContaining({ ssl: undefined }),
    );
  });

  it("liga TLS sem verificar a CA quando DB_SSL=true (RDS)", () => {
    const { PrismaPg } = jest.requireMock("@prisma/adapter-pg");
    process.env.DB_SSL = "true";
    new PrismaService();
    expect(PrismaPg).toHaveBeenLastCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );
    delete process.env.DB_SSL;
  });

  it("should have onModuleInit method", () => {
    expect(typeof service.onModuleInit).toBe("function");
  });

  it("should have onModuleDestroy method", () => {
    expect(typeof service.onModuleDestroy).toBe("function");
  });

  it("should call $connect on onModuleInit", async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it("should call $disconnect on onModuleDestroy", async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});
