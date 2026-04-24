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
    this.produtoId = produtoId;
    this.nomeProduto = nomeProduto;
    this.quantidade = quantidade;
    this.valorUnitario = valorUnitario;
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
