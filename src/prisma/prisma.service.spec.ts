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
