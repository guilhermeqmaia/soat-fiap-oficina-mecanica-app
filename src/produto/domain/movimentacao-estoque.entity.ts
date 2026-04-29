import { InvalidMovimentacaoError } from './errors/invalid-movimentacao.error';
import { TipoMovimentacaoEstoque } from './value-objects/tipo-movimentacao-estoque.vo';

export interface CreateMovimentacaoEstoqueProps {
  produtoId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  estoqueResultante: number;
  ordemDeServicoId?: string | null;
  motivo?: string | null;
  usuarioId?: string | null;
}

export interface ReconstituteMovimentacaoEstoqueProps {
  id: string;
  produtoId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  estoqueResultante: number;
  ordemDeServicoId: string | null;
  motivo: string | null;
  usuarioId: string | null;
  createdAt: Date;
}

export class MovimentacaoEstoque {
  readonly id?: string;
  private readonly _produtoId: string;
  private readonly _tipo: TipoMovimentacaoEstoque;
  private readonly _quantidade: number;
  private readonly _estoqueResultante: number;
  private readonly _ordemDeServicoId: string | null;
  private readonly _motivo: string | null;
  private readonly _usuarioId: string | null;
  private readonly _createdAt?: Date;

  private constructor(
    props: {
      produtoId: string;
      tipo: TipoMovimentacaoEstoque;
      quantidade: number;
      estoqueResultante: number;
      ordemDeServicoId: string | null;
      motivo: string | null;
      usuarioId: string | null;
      createdAt?: Date;
    },
    id?: string,
  ) {
    this.id = id;
    this._produtoId = props.produtoId;
    this._tipo = props.tipo;
    this._quantidade = props.quantidade;
    this._estoqueResultante = props.estoqueResultante;
    this._ordemDeServicoId = props.ordemDeServicoId;
    this._motivo = props.motivo;
    this._usuarioId = props.usuarioId;
    this._createdAt = props.createdAt;
  }

  static create(props: CreateMovimentacaoEstoqueProps): MovimentacaoEstoque {
    if (props.quantidade <= 0) {
      throw new InvalidMovimentacaoError(
        'Quantidade da movimentacao deve ser positiva',
      );
    }
    if (props.estoqueResultante < 0) {
      throw new InvalidMovimentacaoError(
        'Estoque resultante nao pode ser negativo',
      );
    }
    return new MovimentacaoEstoque({
      produtoId: props.produtoId,
      tipo: props.tipo,
      quantidade: props.quantidade,
      estoqueResultante: props.estoqueResultante,
      ordemDeServicoId: props.ordemDeServicoId ?? null,
      motivo: props.motivo ?? null,
      usuarioId: props.usuarioId ?? null,
    });
  }

  static reconstitute(
    props: ReconstituteMovimentacaoEstoqueProps,
  ): MovimentacaoEstoque {
    return new MovimentacaoEstoque(
      {
        produtoId: props.produtoId,
        tipo: props.tipo,
        quantidade: props.quantidade,
        estoqueResultante: props.estoqueResultante,
        ordemDeServicoId: props.ordemDeServicoId,
        motivo: props.motivo,
        usuarioId: props.usuarioId,
        createdAt: props.createdAt,
      },
      props.id,
    );
  }

  get produtoId(): string {
    return this._produtoId;
  }
  get tipo(): TipoMovimentacaoEstoque {
    return this._tipo;
  }
  get quantidade(): number {
    return this._quantidade;
  }
  get estoqueResultante(): number {
    return this._estoqueResultante;
  }
  get ordemDeServicoId(): string | null {
    return this._ordemDeServicoId;
  }
  get motivo(): string | null {
    return this._motivo;
  }
  get usuarioId(): string | null {
    return this._usuarioId;
  }
  get createdAt(): Date | undefined {
    return this._createdAt;
  }
}
