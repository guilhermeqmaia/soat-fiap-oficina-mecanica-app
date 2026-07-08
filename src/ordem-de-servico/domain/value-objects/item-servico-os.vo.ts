import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';
import { ProdutoAlreadyAddedError } from '../errors/produto-already-added.error';
import { ProdutoNotAddedError } from '../errors/produto-not-added.error';
import { ItemProdutoOS } from './item-produto-os.vo';

export type StatusExecucaoItem = 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO';

export class ItemServicoOS {
  readonly servicoId: string;
  readonly quantidade: number;
  readonly precoUnitario: number;
  readonly statusExecucao: StatusExecucaoItem;
  readonly inicioExecucao: Date | null;
  readonly fimExecucao: Date | null;
  readonly horasTrabalhadas: number | null;
  readonly produtos: ReadonlyArray<ItemProdutoOS>;

  constructor(
    servicoId: string,
    quantidade: number,
    precoUnitario: number,
    statusExecucao: StatusExecucaoItem = 'PENDENTE',
    inicioExecucao: Date | null = null,
    fimExecucao: Date | null = null,
    horasTrabalhadas: number | null = null,
    produtos: ItemProdutoOS[] = [],
  ) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new InvalidQuantityError(quantidade);
    }
    if (precoUnitario < 0) {
      throw new InvalidPriceError(precoUnitario);
    }
    // Invariante: um produto nao pode aparecer duas vezes no mesmo servico.
    // Garante a unicidade tambem no caminho de construcao direta (abertura da
    // OS), onde a guarda de adicionarProduto() nao passa.
    const produtoIds = new Set<string>();
    for (const p of produtos) {
      if (produtoIds.has(p.produtoId)) {
        throw new ProdutoAlreadyAddedError(p.produtoId);
      }
      produtoIds.add(p.produtoId);
    }
    this.servicoId = servicoId;
    this.quantidade = quantidade;
    this.precoUnitario = precoUnitario;
    this.statusExecucao = statusExecucao;
    this.inicioExecucao = inicioExecucao;
    this.fimExecucao = fimExecucao;
    this.horasTrabalhadas = horasTrabalhadas;
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

  iniciar(): ItemServicoOS {
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      'EM_EXECUCAO',
      new Date(),
      null,
      null,
      [...this.produtos],
    );
  }

  concluir(horasTrabalhadas: number): ItemServicoOS {
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      'CONCLUIDO',
      this.inicioExecucao,
      new Date(),
      horasTrabalhadas,
      [...this.produtos],
    );
  }

  adicionarProduto(produto: ItemProdutoOS): ItemServicoOS {
    if (this.produtos.some((p) => p.produtoId === produto.produtoId)) {
      throw new ProdutoAlreadyAddedError(produto.produtoId);
    }
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      this.statusExecucao,
      this.inicioExecucao,
      this.fimExecucao,
      this.horasTrabalhadas,
      [...this.produtos, produto],
    );
  }

  removerProduto(produtoId: string): ItemServicoOS {
    if (!this.produtos.some((p) => p.produtoId === produtoId)) {
      throw new ProdutoNotAddedError(produtoId);
    }
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      this.statusExecucao,
      this.inicioExecucao,
      this.fimExecucao,
      this.horasTrabalhadas,
      this.produtos.filter((p) => p.produtoId !== produtoId),
    );
  }
}
