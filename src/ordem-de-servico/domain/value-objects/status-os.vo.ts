export enum StatusOS {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FINALIZADA = 'FINALIZADA',
  ENTREGUE = 'ENTREGUE',
  CANCELADA = 'CANCELADA',
}

export class StatusOSVO {
  readonly valor: StatusOS;

  constructor(status: StatusOS | string) {
    const statusValue = Object.values(StatusOS).find(
      (s) => s === status,
    );
    if (!statusValue) {
      throw new Error(`Status de OS invalido: ${status}`);
    }
    this.valor = statusValue;
  }

  static create(status: string): StatusOSVO {
    return new StatusOSVO(status);
  }

  equals(other: StatusOSVO): boolean {
    return this.valor === other.valor;
  }

  toString(): string {
    return this.valor;
  }
}
