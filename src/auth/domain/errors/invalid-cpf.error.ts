export class InvalidCpfError extends Error {
  constructor(cpf: string) {
    super(`CPF invalido: ${cpf}`);
    this.name = 'InvalidCpfError';
  }
}
