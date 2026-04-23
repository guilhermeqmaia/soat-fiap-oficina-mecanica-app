export class OrdemDeServicoNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Ordem de Servico '${identifier}' nao encontrada`);
    this.name = 'OrdemDeServicoNotFoundError';
  }
}
