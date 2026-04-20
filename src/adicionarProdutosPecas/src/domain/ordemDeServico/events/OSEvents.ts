/**
 * Domain Event: ProdutoAdicionadoNaOS
 * Disparado quando um produto é vinculado a uma OS.
 * O handler deste evento é responsável por RESERVAR a quantidade no estoque.
 *
 * ⚠️  O colega do BC de Estoque deve implementar o handler que escuta este evento.
 */
export class ProdutoAdicionadoNaOS {
  readonly eventName = 'ProdutoAdicionadoNaOS';
  readonly occurredAt: Date;
  readonly ordemDeServicoId: string;
  readonly produtoId: string;
  readonly quantidade: number;

  constructor(props: { ordemDeServicoId: string; produtoId: string; quantidade: number }) {
    this.occurredAt = new Date();
    this.ordemDeServicoId = props.ordemDeServicoId;
    this.produtoId = props.produtoId;
    this.quantidade = props.quantidade;
  }
}

/**
 * Domain Event: ProdutoRemovidoDaOS
 * Disparado quando um produto é desvinculado de uma OS.
 * O handler deste evento é responsável por ESTORNAR a reserva no estoque.
 *
 * ⚠️  O colega do BC de Estoque deve implementar o handler que escuta este evento.
 */
export class ProdutoRemovidoDaOS {
  readonly eventName = 'ProdutoRemovidoDaOS';
  readonly occurredAt: Date;
  readonly ordemDeServicoId: string;
  readonly produtoId: string;
  readonly quantidade: number;

  constructor(props: { ordemDeServicoId: string; produtoId: string; quantidade: number }) {
    this.occurredAt = new Date();
    this.ordemDeServicoId = props.ordemDeServicoId;
    this.produtoId = props.produtoId;
    this.quantidade = props.quantidade;
  }
}

export type DomainEvent = ProdutoAdicionadoNaOS | ProdutoRemovidoDaOS;
