export class InvalidDescriptionError extends Error {
  constructor(message: string = 'Descricao invalida') {
    super(message);
    this.name = 'InvalidDescriptionError';
  }
}
