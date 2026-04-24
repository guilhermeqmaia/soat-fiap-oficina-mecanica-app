export interface DomainEvent {
  readonly eventName: string;
  readonly ocorridoEm: Date;
}

interface ProdutoNaOSProps {
  ordemDeServicoId: string;
  produtoId: string;
  quantidade: number;
}

export class ProdutoAdicionadoNaOS implements DomainEvent {
  readonly eventName = 'ProdutoAdicionadoNaOS';
  readonly ocorridoEm = new Date();
  readonly ordemDeServicoId: string;
  readonly produtoId: string;
  readonly quantidade: number;

  constructor({ ordemDeServicoId, produtoId, quantidade }: ProdutoNaOSProps) {
    this.ordemDeServicoId = ordemDeServicoId;
    this.produtoId = produtoId;
    this.quantidade = quantidade;
  }
}

export class ProdutoRemovidoDaOS implements DomainEvent {
  readonly eventName = 'ProdutoRemovidoDaOS';
  readonly ocorridoEm = new Date();
  readonly ordemDeServicoId: string;
  readonly produtoId: string;
  readonly quantidade: number;

  constructor({ ordemDeServicoId, produtoId, quantidade }: ProdutoNaOSProps) {
    this.ordemDeServicoId = ordemDeServicoId;
    this.produtoId = produtoId;
    this.quantidade = quantidade;
  }
}

export type OSEvent = ProdutoAdicionadoNaOS | ProdutoRemovidoDaOS;
