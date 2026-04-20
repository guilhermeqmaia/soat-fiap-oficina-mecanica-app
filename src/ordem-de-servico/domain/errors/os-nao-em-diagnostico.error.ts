export class OsNaoEmDiagnosticoError extends Error {
  constructor(currentStatus: string) {
    super(
      `OS deve estar com status EM_DIAGNOSTICO para adicionar diagnostico. Status atual: '${currentStatus}'`,
    );
    this.name = 'OsNaoEmDiagnosticoError';
  }
}
