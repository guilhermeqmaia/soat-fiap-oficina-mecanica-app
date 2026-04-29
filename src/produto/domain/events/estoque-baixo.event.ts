export class EstoqueBaixoEvent {
  static readonly EVENT_NAME = 'estoque.baixo';

  constructor(
    public readonly produtoId: string,
    public readonly nomeProduto: string,
    public readonly quantidadeAtual: number,
    public readonly estoqueMinimo: number,
  ) {}
}
