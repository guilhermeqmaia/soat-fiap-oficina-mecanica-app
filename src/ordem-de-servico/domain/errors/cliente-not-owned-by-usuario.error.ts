export class ClienteNotOwnedByUsuarioError extends Error {
  constructor(cpfCnpj: string) {
    super(`Cliente com CPF/CNPJ '${cpfCnpj}' nao pertence ao usuario autenticado`);
    this.name = 'ClienteNotOwnedByUsuarioError';
  }
}
