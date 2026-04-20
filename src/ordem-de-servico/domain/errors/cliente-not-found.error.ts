export class ClienteNotFoundError extends Error {
  constructor(clienteId: string) {
    super(`Cliente com id '${clienteId}' nao encontrado`);
    this.name = 'ClienteNotFoundError';
  }
}
