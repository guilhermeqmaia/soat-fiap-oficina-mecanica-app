export class ProdutoDuplicadoNaOSError extends Error {
  constructor(nomeProduto: string) {
    super(
      `Produto '${nomeProduto}' ja foi adicionado a esta OS. Remova-o antes de adicionar novamente.`,
    );
    this.name = 'ProdutoDuplicadoNaOSError';
  }
}
