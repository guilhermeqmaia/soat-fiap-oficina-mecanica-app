import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';

export class ItemProdutoOS {
  readonly produtoId: string;
  readonly quantidade: number;
  readonly precoUnitario: number;

  constructor(produtoId: string, quantidade: number, precoUnitario: number) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new InvalidQuantityError(quantidade);
    }
    if (precoUnitario < 0) {
      throw new InvalidPriceError(precoUnitario);
    }
    this.produtoId = produtoId;
    this.quantidade = quantidade;
    this.precoUnitario = precoUnitario;
  }

  subtotal(): number {
    return this.quantidade * this.precoUnitario;
  }
}
