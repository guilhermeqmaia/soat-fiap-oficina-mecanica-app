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
        }),
      );

      const result = await service.create(input);

      expect(result.id).toBe("generated-id");
      expect(result.nome).toBe("Joao da Silva");
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
      const cliente = Cliente.reconstitute({
        id: "1",
        nome: "Joao",
        cpfCnpj: "52998224725",
        telefone: "11999998888",
        email: null,
      });

      mockRepository.findAll.mockResolvedValue({
        data: [cliente],
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
      const cliente = Cliente.reconstitute({
        id: "1",
        nome: "Joao",
        cpfCnpj: "52998224725",
        telefone: "11999998888",
        email: null,
      });

      mockRepository.findById.mockResolvedValue(cliente);

      const result = await service.findById("1");
      expect(result.nome).toBe("Joao");
    });

    it("deve lancar NotFoundException quando nao encontrado", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById("999")).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== update ====================

  describe("update", () => {
    const existing = Cliente.reconstitute({
      id: "1",
      nome: "Joao",
      cpfCnpj: "52998224725",
      telefone: "11999998888",
      email: null,
    });

    it("deve atualizar um Cliente", async () => {
      mockRepository.findById.mockResolvedValue(existing);
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

  // ==================== delete ====================

  describe("delete", () => {
    it("deve deletar um Cliente", async () => {
      mockRepository.findById.mockResolvedValue(
        Cliente.reconstitute({
          id: "1",
          nome: "Joao",
          cpfCnpj: "52998224725",
          telefone: "11999998888",
          email: null,
        }),
      );
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete("1");

      expect(mockRepository.delete).toHaveBeenCalledWith("1");
    });

    it("deve lancar NotFoundException quando cliente nao encontrado", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.delete("999")).rejects.toThrow(NotFoundException);
    });
  });
});
