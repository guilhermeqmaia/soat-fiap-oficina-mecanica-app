export class InvalidQuantityError extends Error {
  constructor(quantidade: number) {
    super(`Quantidade invalida: ${quantidade}. Deve ser um inteiro maior que zero`);
    this.name = 'InvalidQuantityError';
  }
}
