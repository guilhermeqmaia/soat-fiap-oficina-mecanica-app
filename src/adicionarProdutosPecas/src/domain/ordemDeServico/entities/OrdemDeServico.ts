import { StatusOrdemDeServico } from '../valueObjects/StatusOrdemDeServico';
import { ItemOrdemDeServico, ItemOrdemDeServicoProps } from '../valueObjects/ItemOrdemDeServico';
import { ProdutoAdicionadoNaOS, ProdutoRemovidoDaOS, DomainEvent } from '../events/OSEvents';

/**
 * Props para construção da entidade.
 * ⚠️  Campos como mecanicoId, veiculoId e outros serão expandidos
 *     pelo colega responsável pelo schema principal da OS.
 */
export interface OrdemDeServicoProps {
  id: string;
  status: StatusOrdemDeServico;
  mecanicoId: string;
  veiculoId: string;
  itens?: ItemOrdemDeServicoProps[];
  // ⚠️  Adicione aqui outros campos que o grupo definir no schema da OS
}

export interface AdicionarProdutoProps {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  valorUnitario: number;
}

/**
 * Entidade Agregada: OrdemDeServico
 * Bounded Context: Atendimento
 *
 * Regras de domínio:
 *  - Produtos só podem ser adicionados/removidos quando status = EM_DIAGNOSTICO
 *  - Cada adição/remoção dispara um Domain Event para o BC de Estoque reagir
 */
export class OrdemDeServico {
  readonly id: string;
  readonly status: StatusOrdemDeServico;
  readonly mecanicoId: string;
  readonly veiculoId: string;
  private readonly _itens: ItemOrdemDeServico[];
  private _events: DomainEvent[];

  constructor({ id, status, mecanicoId, veiculoId, itens = [] }: OrdemDeServicoProps) {
    this.id = id;
    this.status = status;
    this.mecanicoId = mecanicoId;
    this.veiculoId = veiculoId;
    this._itens = itens.map((i) => new ItemOrdemDeServico(i));
    this._events = [];
  }

  // ─── Regras de Domínio ────────────────────────────────────────────────────

  private garantirStatusEmDiagnostico(): void {
    if (this.status !== StatusOrdemDeServico.EM_DIAGNOSTICO) {
      throw new Error(
        `Não é possível alterar itens de uma OS com status "${this.status}". ` +
        `A OS deve estar EM_DIAGNOSTICO.`
      );
    }
  }

  private buscarItemPorProdutoId(produtoId: string): ItemOrdemDeServico | undefined {
    return this._itens.find((i) => i.produtoId === produtoId);
  }

  // ─── Comandos ─────────────────────────────────────────────────────────────

  /**
   * Adiciona um produto/peça à OS e emite evento de domínio.
   * A reserva no estoque é feita pelo handler do evento ProdutoAdicionadoNaOS.
   */
  adicionarProduto({ produtoId, nomeProduto, quantidade, valorUnitario }: AdicionarProdutoProps): ItemOrdemDeServico {
    this.garantirStatusEmDiagnostico();

    if (this.buscarItemPorProdutoId(produtoId)) {
      throw new Error(`Produto "${nomeProduto}" já está na OS. Use a rota de atualização de quantidade.`);
    }

    const novoItem = new ItemOrdemDeServico({ produtoId, nomeProduto, quantidade, valorUnitario });
    this._itens.push(novoItem);

    this._events.push(new ProdutoAdicionadoNaOS({ ordemDeServicoId: this.id, produtoId, quantidade }));

    return novoItem;
  }

  /**
   * Remove um produto/peça da OS e emite evento para estorno da reserva.
   */
  removerProduto(produtoId: string): ItemOrdemDeServico {
    this.garantirStatusEmDiagnostico();

    const index = this._itens.findIndex((i) => i.produtoId === produtoId);
    if (index === -1) {
      throw new Error(`Produto com id "${produtoId}" não encontrado na OS.`);
    }

    const [itemRemovido] = this._itens.splice(index, 1);

    this._events.push(
      new ProdutoRemovidoDaOS({
        ordemDeServicoId: this.id,
        produtoId,
        quantidade: itemRemovido.quantidade,
      })
    );

    return itemRemovido;
  }

  // ─── Leitura ──────────────────────────────────────────────────────────────

  get itens(): ReadonlyArray<ItemOrdemDeServico> {
    return this._itens;
  }

  get valorTotalProdutos(): number {
    return this._itens.reduce((acc, item) => acc + item.valorTotal, 0);
  }

  pullEvents(): DomainEvent[] {
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
