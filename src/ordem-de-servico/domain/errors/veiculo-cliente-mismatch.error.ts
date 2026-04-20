export class VeiculoClienteMismatchError extends Error {
  constructor(veiculoId: string, clienteId: string) {
    super(
      `Veiculo '${veiculoId}' nao pertence ao cliente '${clienteId}'`,
    );
    this.name = 'VeiculoClienteMismatchError';
  }
}
