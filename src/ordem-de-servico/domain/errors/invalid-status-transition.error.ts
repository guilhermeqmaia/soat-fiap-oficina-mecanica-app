export class InvalidStatusTransitionError extends Error {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Transicao invalida de status: nao e possivel ir de '${currentStatus}' para '${targetStatus}'`,
    );
    this.name = 'InvalidStatusTransitionError';
  }
}
