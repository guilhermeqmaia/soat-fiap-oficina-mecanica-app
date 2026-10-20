import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';
import { ProdutoAlreadyAddedError } from '../errors/produto-already-added.error';
import { ItemProdutoOS } from './item-produto-os.vo';

/**
 * Snapshot de um servico da OS (nome/preco congelados no diagnostico). A
 * execucao em si (inicio/fim/horas) e do Execucao Service — aqui fica so o
 * que o cliente ve e o que o orcamento usa.
 */
export class ItemServicoOS {
  readonly servicoId: string;
  readonly nome: string;
  readonly quantidade: number;
  readonly precoUnitario: number;
  readonly produtos: ReadonlyArray<ItemProdutoOS>;

  constructor(
    servicoId: string,
    nome: string,
    quantidade: number,
    precoUnitario: number,
    produtos: ItemProdutoOS[] = [],
  ) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new InvalidQuantityError(quantidade);
    }
    if (precoUnitario < 0) {
      throw new InvalidPriceError(precoUnitario);
    }
    const ids = new Set<string>();
    for (const p of produtos) {
      if (ids.has(p.produtoId)) throw new ProdutoAlreadyAddedError(p.produtoId);
      ids.add(p.produtoId);
    }
    this.servicoId = servicoId;
    this.nome = nome;
    this.quantidade = quantidade;
    this.precoUnitario = precoUnitario;
    this.produtos = produtos;
  }

  subtotalServico(): number {
    return this.quantidade * this.precoUnitario;
  }

  subtotalProdutos(): number {
    return this.produtos.reduce((sum, p) => sum + p.subtotal(), 0);
  }

  subtotal(): number {
    return this.subtotalServico() + this.subtotalProdutos();
  }
}
