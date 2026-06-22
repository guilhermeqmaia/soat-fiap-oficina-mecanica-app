import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Servico } from '../../domain/servico.entity';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import {
  SERVICO_GATEWAY,
  ServicoGateway,
} from '../gateways/servico.gateway';

export interface CriarServicoInput {
  nome: string;
  descricao?: string;
  precoBase: number;
  tempoEstimadoHoras: number;
}

@Injectable()
export class CriarServicoUseCase
  implements UseCase<CriarServicoInput, Servico>
{
  constructor(
    @Inject(SERVICO_GATEWAY)
    private readonly gateway: ServicoGateway,
  ) {}

  async execute(input: CriarServicoInput): Promise<Servico> {
    const exists = await this.gateway.existsByNome(input.nome);
    if (exists) {
      throw new DuplicateNameError(input.nome);
    }

    const servico = Servico.create(input);
    return this.gateway.create(servico);
  }
}
