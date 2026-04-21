export class ServicoNotFoundInCatalogError extends Error {
  constructor(servicoId: string) {
    super(`Servico com id '${servicoId}' nao encontrado no catalogo`);
    this.name = 'ServicoNotFoundInCatalogError';
  }
}
