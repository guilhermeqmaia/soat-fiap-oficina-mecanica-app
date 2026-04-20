export interface ItemProdutoProps {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
}

export class ItemProduto {
  readonly produtoId: string;
  readonly nomeProduto: string;
  readonly quantidade: number;
  readonly valorUnitario: number;

  constructor(props: ItemProdutoProps) {
    if (!props.produtoId) throw new Error('produtoId e obrigatorio');
    if (!props.nomeProduto) throw new Error('nomeProduto e obrigatorio');
    if (!Number.isInteger(props.quantidade) || props.quantidade <= 0) {
      throw new Error('quantidade deve ser um inteiro maior que zero');
    }
    if (props.valorUnitario == null || props.valorUnitario < 0) {
      throw new Error('valorUnitario invalido');
    }

    this.produtoId = props.produtoId;
    this.nomeProduto = props.nomeProduto;
    this.quantidade = props.quantidade;
    this.valorUnitario = props.valorUnitario;
  }

  get valorTotal(): number {
    return this.quantidade * this.valorUnitario;
  }
}
