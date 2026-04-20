export class VeiculoNotFoundError extends Error {
  constructor(veiculoId: string) {
    super(`Veiculo com id '${veiculoId}' nao encontrado`);
    this.name = 'VeiculoNotFoundError';
  }
}
