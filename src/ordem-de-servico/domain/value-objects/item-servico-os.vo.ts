import { InvalidQuantityError } from '../errors/invalid-quantity.error';
import { InvalidPriceError } from '../errors/invalid-price.error';

export type StatusExecucaoItem = 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO';

export class ItemServicoOS {
  readonly servicoId: string;
  readonly quantidade: number;
  readonly precoUnitario: number;
  readonly statusExecucao: StatusExecucaoItem;
  readonly inicioExecucao: Date | null;
  readonly fimExecucao: Date | null;
  readonly horasTrabalhadas: number | null;

  constructor(
    servicoId: string,
    quantidade: number,
    precoUnitario: number,
    statusExecucao: StatusExecucaoItem = 'PENDENTE',
    inicioExecucao: Date | null = null,
    fimExecucao: Date | null = null,
    horasTrabalhadas: number | null = null,
  ) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new InvalidQuantityError(quantidade);
    }
    if (precoUnitario < 0) {
      throw new InvalidPriceError(precoUnitario);
    }
    this.servicoId = servicoId;
    this.quantidade = quantidade;
    this.precoUnitario = precoUnitario;
    this.statusExecucao = statusExecucao;
    this.inicioExecucao = inicioExecucao;
    this.fimExecucao = fimExecucao;
    this.horasTrabalhadas = horasTrabalhadas;
  }

  subtotal(): number {
    return this.quantidade * this.precoUnitario;
  }

  iniciar(): ItemServicoOS {
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      'EM_EXECUCAO',
      new Date(),
      null,
      null,
    );
  }

  concluir(horasTrabalhadas: number): ItemServicoOS {
    return new ItemServicoOS(
      this.servicoId,
      this.quantidade,
      this.precoUnitario,
      'CONCLUIDO',
      this.inicioExecucao,
      new Date(),
      horasTrabalhadas,
    );
  }
}
