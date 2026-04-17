import { ClienteService } from "./cliente.service";
import {
  ClienteRepository,
  CLIENTE_REPOSITORY,
} from "../domain/cliente.repository";
import { Cliente } from "../domain/cliente.entity";
import { DuplicateCpfCnpjError } from "../domain/errors/duplicate-cpf-cnpj.error";
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

const mockRepository: jest.Mocked<ClienteRepository> = {
  existsByCpfCnpj: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByCpfCnpj: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const makeCliente = (overrides: Partial<{
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string | null;
  ativo: boolean;
}> = {}) =>
  Cliente.reconstitute({
    id: overrides.id ?? "1",
    nome: overrides.nome ?? "Joao",
    cpfCnpj: overrides.cpfCnpj ?? "52998224725",
    telefone: overrides.telefone ?? "11999998888",
    email: overrides.email ?? null,
    ativo: overrides.ativo ?? true,
  });

describe("ClienteService", () => {
  let service: ClienteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClienteService,
        { provide: CLIENTE_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ClienteService>(ClienteService);
  });

  // ==================== create ====================

  describe("create", () => {
    const input = {
      nome: "Joao da Silva",
      cpfCnpj: "52998224725",
      telefone: "11999998888",
      email: "joao@email.com",
    };

    it("deve criar um Cliente com sucesso", async () => {
      mockRepository.existsByCpfCnpj.mockResolvedValue(false);
      mockRepository.create.mockImplementation(async (c) =>
        Cliente.reconstitute({
          id: "generated-id",
          nome: c.nome,
          cpfCnpj: c.cpfCnpj.value,
          telefone: c.telefone,
          email: c.email ?? null,
          ativo: c.ativo,
        }),
      );

      const result = await service.create(input);

      expect(result.id).toBe("generated-id");
      expect(result.nome).toBe("Joao da Silva");
      expect(result.ativo).toBe(true);
      expect(mockRepository.existsByCpfCnpj).toHaveBeenCalledWith(
        "52998224725",
      );
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it("deve lancar DuplicateCpfCnpjError quando CPF/CNPJ ja existe", async () => {
      mockRepository.existsByCpfCnpj.mockResolvedValue(true);

      await expect(service.create(input)).rejects.toThrow(
        DuplicateCpfCnpjError,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("deve limpar mascara do CPF antes de verificar duplicidade", async () => {
      mockRepository.existsByCpfCnpj.mockResolvedValue(false);
      mockRepository.create.mockImplementation(async (c) =>
        Cliente.reconstitute({
          id: "id",
          nome: c.nome,
          cpfCnpj: c.cpfCnpj.value,
          telefone: c.telefone,
          email: c.email ?? null,
          ativo: c.ativo,
        }),
      );

      await service.create({ ...input, cpfCnpj: "529.982.247-25" });

      expect(mockRepository.existsByCpfCnpj).toHaveBeenCalledWith(
        "52998224725",
      );
    });
  });

  // ==================== findAll ====================

  describe("findAll", () => {
    it("deve retornar resultados paginados", async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [makeCliente()],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it("deve passar filtro de nome para o repository", async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await service.findAll({ page: 1, limit: 10, nome: "Joao" });

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        nome: "Joao",
      });
    });
  });

  // ==================== findById ====================

  describe("findById", () => {
    it("deve retornar um Cliente", async () => {
      mockRepository.findById.mockResolvedValue(makeCliente({ nome: "Joao" }));
      const result = await service.findById("1");
      expect(result.nome).toBe("Joao");
    });

    it("deve lancar NotFoundException quando nao encontrado", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== findByCpfCnpj ====================

  describe("findByCpfCnpj", () => {
    it("deve retornar um Cliente pelo CPF", async () => {
      mockRepository.findByCpfCnpj.mockResolvedValue(makeCliente());

      const result = await service.findByCpfCnpj("52998224725");
      expect(result.nome).toBe("Joao");
      expect(mockRepository.findByCpfCnpj).toHaveBeenCalledWith("52998224725");
    });

    it("deve normalizar o CPF formatado antes de buscar", async () => {
      mockRepository.findByCpfCnpj.mockResolvedValue(makeCliente());

      await service.findByCpfCnpj("529.982.247-25");

      expect(mockRepository.findByCpfCnpj).toHaveBeenCalledWith("52998224725");
    });

    it("deve normalizar CNPJ formatado", async () => {
      mockRepository.findByCpfCnpj.mockResolvedValue(makeCliente());

      await service.findByCpfCnpj("11.222.333/0001-81");

      expect(mockRepository.findByCpfCnpj).toHaveBeenCalledWith(
        "11222333000181",
      );
    });

    it("deve lancar NotFoundException quando nao encontrado", async () => {
      mockRepository.findByCpfCnpj.mockResolvedValue(null);

      await expect(service.findByCpfCnpj("52998224725")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("deve atualizar um Cliente", async () => {
      mockRepository.findById.mockResolvedValue(makeCliente());
      mockRepository.update.mockImplementation(async (c) => c);

      const result = await service.update("1", {
        nome: "Joao Pedro",
        email: "joao@novo.com",
      });

      expect(result.nome).toBe("Joao Pedro");
      expect(result.email).toBe("joao@novo.com");
    });

    it("deve lancar NotFoundException quando cliente nao encontrado", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update("999", { nome: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== delete (soft) ====================

  describe("delete (soft delete)", () => {
    it("deve desativar um Cliente e persistir via update", async () => {
      const cliente = makeCliente();
      mockRepository.findById.mockResolvedValue(cliente);
      mockRepository.update.mockImplementation(async (c) => c);

      await service.delete("1");

      expect(cliente.ativo).toBe(false);
      expect(mockRepository.update).toHaveBeenCalledWith(cliente);
      // Hard delete must NOT be used
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("deve lancar NotFoundException quando cliente nao encontrado", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete("999")).rejects.toThrow(NotFoundException);
    });
  });
});
