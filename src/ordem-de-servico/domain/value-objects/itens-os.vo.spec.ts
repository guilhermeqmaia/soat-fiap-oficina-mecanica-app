import { ItemServicoOS } from './item-servico-os.vo';
import { ItemProdutoOS } from './item-produto-os.vo';
import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';
import { ProdutoAlreadyAddedError } from '../errors/produto-already-added.error';

describe('ItemServicoOS / ItemProdutoOS (snapshot)', () => {
  it('calcula subtotais de servico, produtos e total', () => {
    const item = new ItemServicoOS('s1', 'Revisao', 2, 100, [new ItemProdutoOS('p1', 'Oleo', 4, 25), new ItemProdutoOS('p2', 'Filtro', 1, 30)]);
    expect(item.subtotalServico()).toBe(200);
    expect(item.subtotalProdutos()).toBe(130);
    expect(item.subtotal()).toBe(330);
  });
  it('valida quantidade inteira positiva e preco nao negativo', () => {
    expect(() => new ItemServicoOS('s', 'n', 0, 10)).toThrow(InvalidQuantityError);
    expect(() => new ItemServicoOS('s', 'n', 1.5, 10)).toThrow(InvalidQuantityError);
    expect(() => new ItemServicoOS('s', 'n', 1, -1)).toThrow(InvalidPriceError);
    expect(() => new ItemProdutoOS('p', 'n', 0, 10)).toThrow(InvalidQuantityError);
    expect(() => new ItemProdutoOS('p', 'n', 1, -1)).toThrow(InvalidPriceError);
  });
  it('nao aceita o mesmo produto duas vezes no servico', () => {
    expect(() => new ItemServicoOS('s', 'n', 1, 1, [new ItemProdutoOS('p', 'a', 1, 1), new ItemProdutoOS('p', 'b', 1, 1)])).toThrow(ProdutoAlreadyAddedError);
  });
  it('preco zero e permitido (servico cortesia)', () => {
    expect(new ItemServicoOS('s', 'Cortesia', 1, 0).subtotal()).toBe(0);
  });
});
