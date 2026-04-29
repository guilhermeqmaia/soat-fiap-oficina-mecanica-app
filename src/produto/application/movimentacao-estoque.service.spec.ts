import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacaoEstoqueService } from './movimentacao-estoque.service';
import {
  MOVIMENTACAO_ESTOQUE_REPOSITORY,
  MovimentacaoEstoqueRepository,
} from '../domain/movimentacao-estoque.repository';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';

describe('MovimentacaoEstoqueService', () => {
  let service: MovimentacaoEstoqueService;
  let repository: jest.Mocked<MovimentacaoEstoqueRepository>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimentacaoEstoqueService,
        { provide: MOVIMENTACAO_ESTOQUE_REPOSITORY, useValue: repository },
      ],
    }).compile();

    service = module.get(MovimentacaoEstoqueService);
  });

  describe('findAll', () => {
    it('delega para o repository com os parametros recebidos', async () => {
      repository.findAll.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await service.findAll({
        page: 2,
        limit: 50,
        produtoId: 'p-1',
        tipo: TipoMovimentacaoEstoque.ENTRADA,
      });

      expect(repository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        produtoId: 'p-1',
        tipo: TipoMovimentacaoEstoque.ENTRADA,
      });
    });
  });
});
