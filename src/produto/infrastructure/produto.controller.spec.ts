import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProdutoController } from './produto.controller';
import { ProdutoService } from '../application/produto.service';
import { MovimentacaoEstoqueService } from '../application/movimentacao-estoque.service';
import { Produto } from '../domain/produto.entity';
import { DuplicateNameError } from '../domain/errors/duplicate-name.error';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';

const mockProduto = Produto.reconstitute({
  id: 'abc-123',
  nome: 'Filtro de oleo',
  descricao: 'Filtro para motor',
  precoUnitario: 29.9,
  quantidadeEstoque: 50,
  quantidadeReservada: 5,
  estoqueMinimo: 10,
  ativo: true,
});

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findLowStock: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addStock: jest.fn(),
  removeStock: jest.fn(),
  reserveStock: jest.fn(),
  releaseStock: jest.fn(),
  deductStock: jest.fn(),
};

const mockMovimentacaoService = {
  findAll: jest.fn(),
};

describe('ProdutoController', () => {
  let controller: ProdutoController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProdutoController],
      providers: [
        { provide: ProdutoService, useValue: mockService },
        { provide: MovimentacaoEstoqueService, useValue: mockMovimentacaoService },
      ],
    }).compile();

    controller = module.get<ProdutoController>(ProdutoController);
  });

  describe('POST /produtos', () => {
    it('should create and return a produto response with stock info', async () => {
      mockService.create.mockResolvedValue(mockProduto);

      const result = await controller.create({
        nome: 'Filtro de oleo',
        precoUnitario: 29.9,
        quantidadeEstoque: 50,
        estoqueMinimo: 10,
      });

      expect(result.id).toBe('abc-123');
      expect(result.quantidadeDisponivel).toBe(45);
      expect(result.quantidadeReservada).toBe(5);
      expect(result.alertaEstoqueBaixo).toBe(false);
    });

    it('should throw ConflictException on duplicate name', async () => {
      mockService.create.mockRejectedValue(new DuplicateNameError('Filtro'));
      await expect(controller.create({
        nome: 'Filtro', precoUnitario: 30, quantidadeEstoque: 50, estoqueMinimo: 10,
      })).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-DuplicateNameError errors', async () => {
      mockService.create.mockRejectedValue(new Error('unexpected'));
      await expect(controller.create({
        nome: 'X', precoUnitario: 30, quantidadeEstoque: 50, estoqueMinimo: 10,
      })).rejects.toThrow('unexpected');
    });
  });

  describe('GET /produtos', () => {
    it('should return paginated response with stock alerts', async () => {
      mockService.findAll.mockResolvedValue({
        data: [mockProduto],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].alertaEstoqueBaixo).toBe(false);
      expect(result.total).toBe(1);
    });

    it('should pass nome filter', async () => {
      mockService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });
      await controller.findAll({ page: 1, limit: 10, nome: 'filtro' });
      expect(mockService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, nome: 'filtro' });
    });
  });

  describe('GET /produtos/:id', () => {
    it('should return a produto response', async () => {
      mockService.findById.mockResolvedValue(mockProduto);
      const result = await controller.findById('abc-123');
      expect(result.nome).toBe('Filtro de oleo');
    });

    it('should propagate NotFoundException', async () => {
      mockService.findById.mockRejectedValue(new NotFoundException());
      await expect(controller.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /produtos/:id', () => {
    it('should update and return a produto response', async () => {
      const updated = Produto.reconstitute({
        id: 'abc-123', nome: 'Filtro premium', descricao: 'Filtro para motor',
        precoUnitario: 49.9, quantidadeEstoque: 50, quantidadeReservada: 5,
        estoqueMinimo: 10, ativo: true,
      });
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('abc-123', { nome: 'Filtro premium', precoUnitario: 49.9 });
      expect(result.nome).toBe('Filtro premium');
      expect(result.precoUnitario).toBe(49.9);
    });

    it('should throw ConflictException on duplicate name', async () => {
      mockService.update.mockRejectedValue(new DuplicateNameError('Outro'));
      await expect(controller.update('abc-123', { nome: 'Outro' })).rejects.toThrow(ConflictException);
    });

    it('should rethrow unknown errors in update', async () => {
      mockService.update.mockRejectedValue(new Error('unexpected'));
      await expect(controller.update('abc-123', { nome: 'Test' })).rejects.toThrow('unexpected');
    });
  });

  describe('POST /produtos/:id/estoque', () => {
    it('should add stock and return updated produto', async () => {
      const updated = Produto.reconstitute({
        id: 'abc-123', nome: 'Filtro de oleo', descricao: 'Filtro para motor',
        precoUnitario: 29.9, quantidadeEstoque: 70, quantidadeReservada: 5,
        estoqueMinimo: 10, ativo: true,
      });
      mockService.addStock.mockResolvedValue(updated);

      const result = await controller.addStock(
        'abc-123',
        { quantidade: 20 },
        { id: 'usr-1' } as any,
      );
      expect(result.quantidadeEstoque).toBe(70);
    });
  });

  describe('POST /produtos/:id/reservar', () => {
    it('should reserve stock and return updated produto', async () => {
      const updated = Produto.reconstitute({
        id: 'abc-123', nome: 'Filtro de oleo', descricao: 'Filtro para motor',
        precoUnitario: 29.9, quantidadeEstoque: 50, quantidadeReservada: 15,
        estoqueMinimo: 10, ativo: true,
      });
      mockService.reserveStock.mockResolvedValue(updated);

      const result = await controller.reserveStock('abc-123', { quantidade: 10 });
      expect(result.quantidadeReservada).toBe(15);
      expect(result.quantidadeDisponivel).toBe(35);
    });

    it('should throw ConflictException when stock is insufficient', async () => {
      mockService.reserveStock.mockRejectedValue(
        new InsufficientStockError('Filtro de oleo', 100, 50),
      );

      await expect(
        controller.reserveStock('abc-123', { quantidade: 100 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should propagate NotFoundException', async () => {
      mockService.reserveStock.mockRejectedValue(new NotFoundException());
      await expect(
        controller.reserveStock('999', { quantidade: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /produtos/:id/liberar', () => {
    it('should release stock and return updated produto', async () => {
      const updated = Produto.reconstitute({
        id: 'abc-123', nome: 'Filtro de oleo', descricao: 'Filtro para motor',
        precoUnitario: 29.9, quantidadeEstoque: 50, quantidadeReservada: 5,
        estoqueMinimo: 10, ativo: true,
      });
      mockService.releaseStock.mockResolvedValue(updated);

      const result = await controller.releaseStock('abc-123', { quantidade: 10 });
      expect(result.quantidadeReservada).toBe(5);
    });
  });

  describe('DELETE /produtos/:id', () => {
    it('should delete a produto', async () => {
      mockService.delete.mockResolvedValue(undefined);
      await controller.delete('abc-123');
      expect(mockService.delete).toHaveBeenCalledWith('abc-123');
    });

    it('should propagate NotFoundException', async () => {
      mockService.delete.mockRejectedValue(new NotFoundException());
      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
