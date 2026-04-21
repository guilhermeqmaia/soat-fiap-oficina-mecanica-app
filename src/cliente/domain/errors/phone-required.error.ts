export class PhoneRequiredError extends Error {
  constructor() {
    super("Telefone do cliente e obrigatorio");
    this.name = "PhoneRequiredError";
  }
}
