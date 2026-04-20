/**
 * Value Object: ItemOrdemDeServico
 * Representa um produto/peça vinculado a uma OS, com quantidade e valor unitário.
 * Imutável — qualquer alteração gera um novo objeto.
 */

export interface ItemOrdemDeServicoProps {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
}

export interface ItemOrdemDeServicoJSON {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export class ItemOrdemDeServico {
  readonly produtoId: string;
  readonly nomeProduto: string;
  readonly quantidade: number;
  readonly valorUnitario: number;

  constructor({ produtoId, nomeProduto, quantidade, valorUnitario }: ItemOrdemDeServicoProps) {
    if (!produtoId) throw new Error('produtoId é obrigatório');
    if (!nomeProduto) throw new Error('nomeProduto é obrigatório');
    if (!quantidade || quantidade <= 0) throw new Error('quantidade deve ser maior que zero');
    if (valorUnitario == null || valorUnitario < 0) throw new Error('valorUnitario inválido');

    this.produtoId = produtoId;
    this.nomeProduto = nomeProduto;
    this.quantidade = quantidade;
    this.valorUnitario = valorUnitario;

    Object.freeze(this);
  }

  get valorTotal(): number {
    return this.quantidade * this.valorUnitario;
  }

  toJSON(): ItemOrdemDeServicoJSON {
    return {
      produtoId: this.produtoId,
      nomeProduto: this.nomeProduto,
      quantidade: this.quantidade,
      valorUnitario: this.valorUnitario,
      valorTotal: this.valorTotal,
    };
  }
}
