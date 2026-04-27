export class ItemServicoInvalidStatusError extends Error {
  constructor(servicoId: string, statusAtual: string, operacao: string) {
    super(
      `Servico '${servicoId}' com status '${statusAtual}' nao permite operacao '${operacao}'`,
    );
    this.name = 'ItemServicoInvalidStatusError';
  }
}
