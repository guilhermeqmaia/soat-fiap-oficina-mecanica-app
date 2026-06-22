import { Produto } from '../../domain/produto.entity';
import { ProdutoPresenter } from './produto.presenter';

function fakeProduto(estoque = 50, minimo = 10) {
  return Produto.reconstitute({
    id: 'prod-1',
    nome: 'Filtro de oleo',
    descricao: 'Filtro para motor',
    precoUnitario: 29.9,
    quantidadeEstoque: estoque,
    quantidadeReservada: 5,
    estoqueMinimo: minimo,
    ativo: true,
  });
}

describe('ProdutoPresenter', () => {
  describe('toResponse', () => {
    it('maps all fields correctly', () => {
      const produto = fakeProduto();
      const response = ProdutoPresenter.toResponse(produto);

      expect(response.id).toBe('prod-1');
      expect(response.nome).toBe('Filtro de oleo');
      expect(response.descricao).toBe('Filtro para motor');
      expect(response.precoUnitario).toBe(29.9);
      expect(response.quantidadeEstoque).toBe(50);
      expect(response.quantidadeReservada).toBe(5);
      expect(response.quantidadeDisponivel).toBe(45);
      expect(response.estoqueMinimo).toBe(10);
      expect(response.ativo).toBe(true);
      expect(response.alertaEstoqueBaixo).toBe(false);
    });

    it('sets alertaEstoqueBaixo to true when estoque <= minimo', () => {
      const produto = fakeProduto(8, 10);
      const response = ProdutoPresenter.toResponse(produto);
      expect(response.alertaEstoqueBaixo).toBe(true);
    });

    it('sets alertaEstoqueBaixo to true when estoque equals minimo', () => {
      const produto = fakeProduto(10, 10);
      const response = ProdutoPresenter.toResponse(produto);
      expect(response.alertaEstoqueBaixo).toBe(true);
    });
  });

  describe('toPaginatedResponse', () => {
    it('wraps data array with pagination metadata', () => {
      const produto = fakeProduto();
      const result = ProdutoPresenter.toPaginatedResponse({
        data: [produto],
        total: 1,
        page: 2,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.data[0].nome).toBe('Filtro de oleo');
    });
  });

  describe('toResponseList', () => {
    it('maps a plain array of produtos', () => {
      const p1 = fakeProduto(50, 10);
      const p2 = fakeProduto(3, 10);
      const result = ProdutoPresenter.toResponseList([p1, p2]);

      expect(result).toHaveLength(2);
      expect(result[0].alertaEstoqueBaixo).toBe(false);
      expect(result[1].alertaEstoqueBaixo).toBe(true);
    });
  });
});
