/**
 * Erros de domínio customizados — linguagem ubíqua da oficina.
 * Cada erro carrega o HTTP status adequado para o controller mapear.
 */

export class ErroOSNaoEncontrada extends Error {
  readonly statusHttp = 404;

  constructor(id: string) {
    super(`Ordem de Serviço "${id}" não encontrada.`);
    this.name = 'ErroOSNaoEncontrada';
    Object.setPrototypeOf(this, ErroOSNaoEncontrada.prototype);
  }
}

export class ErroProdutoNaoEncontrado extends Error {
  readonly statusHttp = 404;

  constructor(id: string) {
    super(`Produto "${id}" não encontrado no estoque.`);
    this.name = 'ErroProdutoNaoEncontrado';
    Object.setPrototypeOf(this, ErroProdutoNaoEncontrado.prototype);
  }
}

export interface DetalhesEstoqueInsuficiente {
  produtoId: string;
  nomeProduto: string;
  quantidadeSolicitada: number;
  quantidadeDisponivel: number;
}

/**
 * ErroEstoqueInsuficiente — Policy v3
 * Informa ao mecânico que o produto não tem estoque suficiente.
 */
export class ErroEstoqueInsuficiente extends Error {
  readonly statusHttp = 422;
  readonly detalhes: DetalhesEstoqueInsuficiente;

  constructor({ produtoId, nomeProduto, quantidadeSolicitada, quantidadeDisponivel }: DetalhesEstoqueInsuficiente) {
    super(
      `Estoque insuficiente para "${nomeProduto}". ` +
      `Solicitado: ${quantidadeSolicitada}, disponível: ${quantidadeDisponivel}.`
    );
    this.name = 'ErroEstoqueInsuficiente';
    this.detalhes = { produtoId, nomeProduto, quantidadeSolicitada, quantidadeDisponivel };
    Object.setPrototypeOf(this, ErroEstoqueInsuficiente.prototype);
  }
}

export type DomainError = ErroOSNaoEncontrada | ErroProdutoNaoEncontrado | ErroEstoqueInsuficiente;
