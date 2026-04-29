import { ProdutoService } from './produto.service';
import { ProdutoRepository, PRODUTO_REPOSITORY } from '../domain/produto.repository';
import { Produto } from '../domain/produto.entity';
import { DuplicateNameError } from '../domain/errors/duplicate-name.error';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import {
  ESTOQUE_UNIT_OF_WORK,
  EstoqueUnitOfWork,
} from '../domain/estoque-unit-of-work';

const mockRepository: jest.Mocked<ProdutoRepository> = {
  existsByNome: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findLowStock: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockUow: jest.Mocked<EstoqueUnitOfWork> = {
  persistirAtualizacaoComMovimentacao: jest
    .fn()
    .mockImplementation(async (produto, movimentacao) => ({
      produto,
      movimentacao,
    })),
};

const mockEventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;

describe('ProdutoService', () => {
  let service: ProdutoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProdutoService,
        { provide: PRODUTO_REPOSITORY, useValue: mockRepository },
        { provide: ESTOQUE_UNIT_OF_WORK, useValue: mockUow },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ProdutoService>(ProdutoService);
  });

  describe('create', () => {
    const input = {
      nome: 'Filtro de oleo',
      descricao: 'Filtro para motor',
      precoUnitario: 29.9,
      quantidadeEstoque: 50,
      estoqueMinimo: 10,
    };

    it('should create a Produto', async () => {
      mockRepository.existsByNome.mockResolvedValue(false);
      mockRepository.create.mockImplementation(async (p) =>
        Produto.reconstitute({
          id: 'generated-id',
          nome: p.nome,
          descricao: p.descricao ?? null,
          precoUnitario: p.precoUnitario.value,
          quantidadeEstoque: p.quantidadeEstoque,
          quantidadeReservada: p.quantidadeReservada,
          estoqueMinimo: p.estoqueMinimo,
          ativo: p.ativo,
        }),
      );

      const result = await service.create(input);

      expect(result.id).toBe('generated-id');
      expect(result.nome).toBe('Filtro de oleo');
      expect(mockRepository.existsByNome).toHaveBeenCalledWith('Filtro de oleo');
    });

    it('should throw DuplicateNameError when nome already exists', async () => {
      mockRepository.existsByNome.mockResolvedValue(true);
      await expect(service.create(input)).rejects.toThrow(DuplicateNameError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.total).toBe(0);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should pass nome filter', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });
      await service.findAll({ page: 1, limit: 10, nome: 'filtro' });
      expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, nome: 'filtro' });
    });
  });

  describe('findById', () => {
    it('should return a Produto', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 10, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);

      const result = await service.findById('1');
      expect(result.nome).toBe('Filtro');
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = Produto.reconstitute({
      id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
      quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 10, ativo: true,
    });

    it('should update a Produto', async () => {
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.existsByNome.mockResolvedValue(false);
      mockRepository.update.mockImplementation(async (p) => p);

      const result = await service.update('1', { nome: 'Filtro premium', precoUnitario: 49.9 });
      expect(result.nome).toBe('Filtro premium');
      expect(result.precoUnitario.value).toBe(49.9);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('999', { nome: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw DuplicateNameError when new nome exists', async () => {
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.existsByNome.mockResolvedValue(true);
      await expect(service.update('1', { nome: 'Outro' })).rejects.toThrow(DuplicateNameError);
    });

    it('should skip duplicate check when nome is not changed', async () => {
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.update.mockImplementation(async (p) => p);
      await service.update('1', { precoUnitario: 50 });
      expect(mockRepository.existsByNome).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a Produto', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 10, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete('1');
      expect(mockRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.delete('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addStock', () => {
    it('should add stock to a Produto', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 10, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);
      mockRepository.update.mockImplementation(async (p) => p);

      const result = await service.addStock('1', 20);
      expect(result.quantidadeEstoque).toBe(70);
    });

    it('should throw NotFoundException when produto not found in addStock', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.addStock('999', 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 10, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);
      mockRepository.update.mockImplementation(async (p) => p);

      const result = await service.reserveStock('1', 10);
      expect(result.quantidadeReservada).toBe(10);
      expect(result.quantidadeDisponivel).toBe(40);
    });

    it('should throw InsufficientStockError when exceeding available', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 10, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);

      await expect(service.reserveStock('1', 11)).rejects.toThrow(InsufficientStockError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.reserveStock('999', 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseStock', () => {
    it('should release reserved stock', async () => {
      const produto = Produto.reconstitute({
        id: '1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 50, quantidadeReservada: 10, estoqueMinimo: 10, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);
      mockRepository.update.mockImplementation(async (p) => p);

      const result = await service.releaseStock('1', 5);
      expect(result.quantidadeReservada).toBe(5);
      expect(result.quantidadeDisponivel).toBe(45);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.releaseStock('999', 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('US-18: registro de movimentacao + EstoqueBaixoEvent', () => {
    const fazerProduto = (estoque: number, minimo: number) =>
      Produto.reconstitute({
        id: 'p-1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: estoque, quantidadeReservada: 0,
        estoqueMinimo: minimo, ativo: true,
      });

    it('addStock registra movimentacao tipo ENTRADA com motivo e usuario', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(20, 5));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.addStock('p-1', 10, {
        motivo: 'Compra fornecedor',
        usuarioId: 'u-1',
      });

      expect(mockUow.persistirAtualizacaoComMovimentacao).toHaveBeenCalledTimes(1);
      const arg = mockUow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
      expect(arg.tipo).toBe('ENTRADA');
      expect(arg.quantidade).toBe(10);
      expect(arg.estoqueResultante).toBe(30);
      expect(arg.motivo).toBe('Compra fornecedor');
      expect(arg.usuarioId).toBe('u-1');
    });

    it('reserveStock registra movimentacao tipo RESERVA com ordemDeServicoId', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(20, 5));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.reserveStock('p-1', 3, { ordemDeServicoId: 'os-9' });

      const arg = mockUow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
      expect(arg.tipo).toBe('RESERVA');
      expect(arg.quantidade).toBe(3);
      expect(arg.ordemDeServicoId).toBe('os-9');
    });

    it('releaseStock registra movimentacao tipo ESTORNO_RESERVA', async () => {
      const produto = Produto.reconstitute({
        id: 'p-1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 20, quantidadeReservada: 5,
        estoqueMinimo: 5, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);
      mockRepository.update.mockImplementation(async (p) => p);

      await service.releaseStock('p-1', 5, { ordemDeServicoId: 'os-9' });

      const arg = mockUow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
      expect(arg.tipo).toBe('ESTORNO_RESERVA');
    });

    it('deductStock registra movimentacao tipo BAIXA', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(20, 5));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.deductStock('p-1', 4, {
        ordemDeServicoId: 'os-7',
        motivo: 'Baixa por execucao de servico',
      });

      const arg = mockUow.persistirAtualizacaoComMovimentacao.mock.calls[0][1];
      expect(arg.tipo).toBe('BAIXA');
      expect(arg.quantidade).toBe(4);
      expect(arg.estoqueResultante).toBe(16);
      expect(arg.ordemDeServicoId).toBe('os-7');
    });

    it('removeStock falha quando excede o disponivel', async () => {
      const produto = Produto.reconstitute({
        id: 'p-1', nome: 'Filtro', descricao: null, precoUnitario: 30,
        quantidadeEstoque: 5, quantidadeReservada: 3,
        estoqueMinimo: 1, ativo: true,
      });
      mockRepository.findById.mockResolvedValue(produto);

      await expect(service.removeStock('p-1', 5)).rejects.toThrow(InsufficientStockError);
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockUow.persistirAtualizacaoComMovimentacao).not.toHaveBeenCalled();
    });

    it('emite EstoqueBaixoEvent quando deductStock leva o estoque <= minimo', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(11, 10));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.deductStock('p-1', 2);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estoque.baixo',
        expect.objectContaining({
          produtoId: 'p-1',
          nomeProduto: 'Filtro',
          quantidadeAtual: 9,
          estoqueMinimo: 10,
        }),
      );
    });

    it('NAO emite EstoqueBaixoEvent quando ainda esta acima do minimo', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(50, 10));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.deductStock('p-1', 2);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('NAO emite EstoqueBaixoEvent em RESERVA (apenas em BAIXA/SAIDA)', async () => {
      mockRepository.findById.mockResolvedValue(fazerProduto(11, 10));
      mockRepository.update.mockImplementation(async (p) => p);

      await service.reserveStock('p-1', 5);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findLowStock', () => {
    it('retorna apenas produtos ativos com estoque <= minimo', async () => {
      const baixo = Produto.reconstitute({
        id: '1', nome: 'P1', descricao: null, precoUnitario: 10,
        quantidadeEstoque: 3, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true,
      });
      const ok = Produto.reconstitute({
        id: '2', nome: 'P2', descricao: null, precoUnitario: 10,
        quantidadeEstoque: 50, quantidadeReservada: 0, estoqueMinimo: 5, ativo: true,
      });
      const inativo = Produto.reconstitute({
        id: '3', nome: 'P3', descricao: null, precoUnitario: 10,
        quantidadeEstoque: 0, quantidadeReservada: 0, estoqueMinimo: 5, ativo: false,
      });
      // Repository agora filtra no banco; mocka o resultado ja filtrado
      void ok;
      void inativo;
      mockRepository.findLowStock.mockResolvedValue([baixo]);

      const result = await service.findLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});
