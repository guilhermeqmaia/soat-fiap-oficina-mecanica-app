export class ServicoNotAddedError extends Error {
  constructor(servicoId: string) {
    super(`Servico '${servicoId}' nao esta nesta Ordem de Servico`);
    this.name = 'ServicoNotAddedError';
  }
}
