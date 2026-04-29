export class InvalidMovimentacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMovimentacaoError';
  }
}
