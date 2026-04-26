export class OsFinalizadaEvent {
  static readonly EVENT_NAME = 'os.finalizada';

  constructor(
    public readonly ordemDeServicoId: string,
    public readonly numero: string,
    public readonly clienteId: string,
  ) {}
}
