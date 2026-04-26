export class OrcamentoProntoEvent {
  static readonly EVENT_NAME = 'os.orcamento-pronto';

  constructor(
    public readonly ordemDeServicoId: string,
    public readonly numero: string,
    public readonly clienteId: string,
    public readonly diagnostico: string,
    public readonly valorTotal: number,
  ) {}
}
