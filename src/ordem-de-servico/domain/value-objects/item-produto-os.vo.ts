import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';

/**
 * Snapshot de uma peca usada num servico da OS. `produtoId` referencia o
 * catalogo/estoque do Execucao Service; `nome` e `precoUnitario` sao copiados
 * do evento `execucao.diagnostico-concluido` (preco congelado — RFC-0004).
 */
export class ItemProdutoOS {
  readonly produtoId: string;
  readonly nome: string;
  readonly quantidade: number;
  readonly precoUnitario: number;

  constructor(produtoId: string, nome: string, quantidade: number, precoUnitario: number) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new InvalidQuantityError(quantidade);
    }
    if (precoUnitario < 0) {
      throw new InvalidPriceError(precoUnitario);
    }
    this.produtoId = produtoId;
    this.nome = nome;
    this.quantidade = quantidade;
    this.precoUnitario = precoUnitario;
  }

  subtotal(): number {
    return this.quantidade * this.precoUnitario;
  }
}
