export class NameRequiredError extends Error {
  constructor() {
    super("Nome do cliente e obrigatorio");
    this.name = "NameRequiredError";
  }
}
