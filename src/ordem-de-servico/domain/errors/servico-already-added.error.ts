export class ServicoAlreadyAddedError extends Error {
  constructor(servicoId: string) {
    super(`Servico '${servicoId}' ja foi adicionado a esta Ordem de Servico`);
    this.name = 'ServicoAlreadyAddedError';
  }
}
