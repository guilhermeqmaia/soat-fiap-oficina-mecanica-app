export class InvalidDescricaoError extends Error {
  constructor(message: string = 'Descricao invalida') {
    super(message);
    this.name = 'InvalidDescricaoError';
  }
}
