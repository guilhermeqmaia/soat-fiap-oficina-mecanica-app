import { StatusOrdemDeServico } from '../valueObjects/StatusOrdemDeServico';
import { ItemOrdemDeServico, ItemOrdemDeServicoProps } from '../valueObjects/ItemOrdemDeServico';
import { ProdutoAdicionadoNaOS, ProdutoRemovidoDaOS, OSEvent } from '../events/OSEvents';
import {
  ErroStatusOSInvalido,
  ErroProdutoDuplicadoNaOS,
  ErroProdutoNaoEncontradoNaOS,
} from '../../../shared/errors/DomainErrors';

export interface OrdemDeServicoProps {
  id: string;
  status: StatusOrdemDeServico;
  mecanicoId: string;
  veiculoId: string;
  itens?: ItemOrdemDeServicoProps[];
}

export interface AdicionarProdutoProps {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
}

export class OrdemDeServico {
  readonly id: string;
  readonly status: StatusOrdemDeServico;
  readonly mecanicoId: string;
  readonly veiculoId: string;
  private readonly _itens: ItemOrdemDeServico[];
  private _events: OSEvent[];

  constructor({ id, status, mecanicoId, veiculoId, itens = [] }: OrdemDeServicoProps) {
    this.id = id;
    this.status = status;
    this.mecanicoId = mecanicoId;
    this.veiculoId = veiculoId;
    this._itens = itens.map((i) => new ItemOrdemDeServico(i));
    this._events = [];
  }

  private garantirStatusEmDiagnostico(): void {
    if (this.status !== StatusOrdemDeServico.EM_DIAGNOSTICO) {
      throw new ErroStatusOSInvalido(this.status);
    }
  }

  private buscarItemPorProdutoId(produtoId: string): ItemOrdemDeServico | undefined {
    return this._itens.find((i) => i.produtoId === produtoId);
  }

  adicionarProduto({ produtoId, nomeProduto, quantidade, valorUnitario }: AdicionarProdutoProps): ItemOrdemDeServico {
    this.garantirStatusEmDiagnostico();

    if (this.buscarItemPorProdutoId(produtoId)) {
      throw new ErroProdutoDuplicadoNaOS(nomeProduto);
    }

    const novoItem = new ItemOrdemDeServico({ produtoId, nomeProduto, quantidade, valorUnitario });
    this._itens.push(novoItem);
    this._events.push(new ProdutoAdicionadoNaOS({ ordemDeServicoId: this.id, produtoId, quantidade }));

    return novoItem;
  }

  removerProduto(produtoId: string): ItemOrdemDeServico {
    this.garantirStatusEmDiagnostico();

    const index = this._itens.findIndex((i) => i.produtoId === produtoId);
    if (index === -1) {
      throw new ErroProdutoNaoEncontradoNaOS(produtoId);
    }

    const [itemRemovido] = this._itens.splice(index, 1);
    this._events.push(
      new ProdutoRemovidoDaOS({ ordemDeServicoId: this.id, produtoId, quantidade: itemRemovido.quantidade }),
    );

    return itemRemovido;
  }

  get itens(): ReadonlyArray<ItemOrdemDeServico> {
    return this._itens;
  }

  get valorTotalProdutos(): number {
    return this._itens.reduce((acc, item) => acc + item.valorTotal, 0);
  }

  pullEvents(): OSEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      mecanicoId: this.mecanicoId,
      veiculoId: this.veiculoId,
      itens: this._itens.map((i) => i.toJSON()),
      valorTotalProdutos: this.valorTotalProdutos,
    };
  }
}
