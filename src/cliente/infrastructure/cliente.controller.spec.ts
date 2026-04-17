import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ClienteController } from "./cliente.controller";
import { ClienteService } from "../application/cliente.service";
import { Cliente } from "../domain/cliente.entity";
import { DuplicateCpfCnpjError } from "../domain/errors/duplicate-cpf-cnpj.error";
import { InvalidCpfCnpjError } from "../domain/errors/invalid-cpf-cnpj.error";

const makeCliente = (ativo = true) =>
  Cliente.reconstitute({
    id: "abc-123",
    nome: "Joao da Silva",
    cpfCnpj: "52998224725",
    telefone: "11999998888",
    email: "joao@email.com",
    ativo,
  });

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCpfCnpj: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe("ClienteController", () => {
  let controller: ClienteController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClienteController],
      providers: [{ provide: ClienteService, useValue: mockService }],
    }).compile();

    controller = module.get<ClienteController>(ClienteController);
  });

  // ==================== POST /clientes ====================

  describe("POST /clientes", () => {
    const dto = {
      nome: "Joao da Silva",
      cpfCnpj: "52998224725",
      telefone: "11999998888",
      email: "joao@email.com",
    };

    it("deve criar e retornar o response do cliente", async () => {
      mockService.create.mockResolvedValue(makeCliente());

      const result = await controller.create(dto);

      expect(result).toEqual({
        id: "abc-123",
        nome: "Joao da Silva",
        cpfCnpj: "52998224725",
        telefone: "11999998888",
        email: "joao@email.com",
        ativo: true,
      });
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it("deve lancar ConflictException para CPF/CNPJ duplicado", async () => {
      mockService.create.mockRejectedValue(
        new DuplicateCpfCnpjError("52998224725"),
      );

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it("deve lancar BadRequestException para CPF/CNPJ invalido", async () => {
      mockService.create.mockRejectedValue(
        new InvalidCpfCnpjError("00000000000"),
      );

      await expect(controller.create(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("deve relancar erros nao tratados", async () => {
      mockService.create.mockRejectedValue(new Error("erro inesperado"));

      await expect(controller.create(dto)).rejects.toThrow("erro inesperado");
    });
  });

  // ==================== GET /clientes ====================

  describe("GET /clientes", () => {
    it("deve retornar lista paginada", async () => {
      mockService.findAll.mockResolvedValue({
        data: [makeCliente()],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].cpfCnpj).toBe("52998224725");
      expect(result.data[0].ativo).toBe(true);
      expect(result.total).toBe(1);
    });

    it("deve passar filtro de nome", async () => {
      mockService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.findAll({ page: 1, limit: 10, nome: "Joao" });

      expect(mockService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        nome: "Joao",
      });
    });
  });

  // ==================== GET /clientes/:id ====================

  describe("GET /clientes/:id", () => {
    it("deve retornar o response do cliente", async () => {
      mockService.findById.mockResolvedValue(makeCliente());

      const result = await controller.findById("abc-123");

      expect(result.id).toBe("abc-123");
      expect(result.nome).toBe("Joao da Silva");
    });

    it("deve propagar NotFoundException", async () => {
      mockService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findById("999")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== GET /clientes/documento/:cpfCnpj ====================

  describe("GET /clientes/documento/:cpfCnpj", () => {
    it("deve buscar cliente por CPF normalizado", async () => {
      mockService.findByCpfCnpj.mockResolvedValue(makeCliente());

      const result = await controller.findByCpfCnpj("52998224725");

      expect(result.cpfCnpj).toBe("52998224725");
      expect(mockService.findByCpfCnpj).toHaveBeenCalledWith("52998224725");
    });

    it("deve normalizar CPF formatado antes de chamar o service", async () => {
      mockService.findByCpfCnpj.mockResolvedValue(makeCliente());

      await controller.findByCpfCnpj("529.982.247-25");

      expect(mockService.findByCpfCnpj).toHaveBeenCalledWith("52998224725");
    });

    it("deve normalizar CNPJ formatado", async () => {
      mockService.findByCpfCnpj.mockResolvedValue(makeCliente());

      await controller.findByCpfCnpj("11.222.333/0001-81");

      expect(mockService.findByCpfCnpj).toHaveBeenCalledWith("11222333000181");
    });

    it("deve rejeitar CPF/CNPJ com quantidade invalida de digitos", async () => {
      await expect(controller.findByCpfCnpj("12345")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.findByCpfCnpj).not.toHaveBeenCalled();
    });

    it("deve rejeitar input sem digitos", async () => {
      await expect(controller.findByCpfCnpj("---")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("deve propagar NotFoundException do service", async () => {
      mockService.findByCpfCnpj.mockRejectedValue(new NotFoundException());

      await expect(
        controller.findByCpfCnpj("52998224725"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== PATCH /clientes/:id ====================

  describe("PATCH /clientes/:id", () => {
    it("deve atualizar e retornar o response do cliente", async () => {
      const updated = Cliente.reconstitute({
        id: "abc-123",
        nome: "Joao Pedro",
        cpfCnpj: "52998224725",
        telefone: "11999998888",
        email: "novo@email.com",
        ativo: true,
      });
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update("abc-123", {
        nome: "Joao Pedro",
        email: "novo@email.com",
      });

      expect(result.nome).toBe("Joao Pedro");
      expect(result.email).toBe("novo@email.com");
    });

    it("deve propagar NotFoundException", async () => {
      mockService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update("999", { nome: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== DELETE /clientes/:id ====================

  describe("DELETE /clientes/:id (soft delete)", () => {
    it("deve chamar o service.delete (soft delete)", async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete("abc-123");

      expect(mockService.delete).toHaveBeenCalledWith("abc-123");
    });

    it("deve propagar NotFoundException", async () => {
      mockService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete("999")).rejects.toThrow(NotFoundException);
    });
  });
});
