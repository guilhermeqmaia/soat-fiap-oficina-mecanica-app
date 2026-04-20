export class OSNaoEncontradaError extends Error {
  constructor(id: string) {
    super(`Ordem de Servico com id '${id}' nao encontrada`);
    this.name = 'OSNaoEncontradaError';
  }
}
