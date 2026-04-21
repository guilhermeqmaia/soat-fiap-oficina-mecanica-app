export class InvalidPriceError extends Error {
  constructor(preco: number) {
    super(`Preco invalido: ${preco}. Deve ser maior ou igual a zero`);
    this.name = 'InvalidPriceError';
  }
}
