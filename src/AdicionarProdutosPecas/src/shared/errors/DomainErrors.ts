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

/**
 * Lançado quando se tenta modificar itens de uma OS que não está EM_DIAGNOSTICO.
 */
export class ErroStatusOSInvalido extends Error {
  readonly statusHttp = 422;

  constructor(statusAtual: string) {
    super(
      `Não é possível alterar itens de uma OS com status "${statusAtual}". ` +
      `A OS deve estar EM_DIAGNOSTICO.`
    );
    this.name = 'ErroStatusOSInvalido';
    Object.setPrototypeOf(this, ErroStatusOSInvalido.prototype);
  }
}

/**
 * Lançado quando o produto já foi adicionado à OS.
 */
export class ErroProdutoDuplicadoNaOS extends Error {
  readonly statusHttp = 409;

  constructor(nomeProduto: string) {
    super(`Produto "${nomeProduto}" já está na OS. Use a rota de atualização de quantidade.`);
    this.name = 'ErroProdutoDuplicadoNaOS';
    Object.setPrototypeOf(this, ErroProdutoDuplicadoNaOS.prototype);
  }
}

/**
 * Lançado quando o produto não consta na lista de itens da OS.
 */
export class ErroProdutoNaoEncontradoNaOS extends Error {
  readonly statusHttp = 404;

  constructor(produtoId: string) {
    super(`Produto com id "${produtoId}" não encontrado na OS.`);
    this.name = 'ErroProdutoNaoEncontradoNaOS';
    Object.setPrototypeOf(this, ErroProdutoNaoEncontradoNaOS.prototype);
  }
}

export type DomainError =
  | ErroOSNaoEncontrada
  | ErroProdutoNaoEncontrado
  | ErroEstoqueInsuficiente
  | ErroStatusOSInvalido
  | ErroProdutoDuplicadoNaOS
  | ErroProdutoNaoEncontradoNaOS;
