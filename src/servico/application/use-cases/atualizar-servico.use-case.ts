import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Servico } from '../../domain/servico.entity';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import {
  SERVICO_GATEWAY,
  ServicoGateway,
} from '../gateways/servico.gateway';

export interface AtualizarServicoInput {
  id: string;
  nome?: string;
  descricao?: string;
  precoBase?: number;
  tempoEstimadoHoras?: number;
}

@Injectable()
export class AtualizarServicoUseCase
  implements UseCase<AtualizarServicoInput, Servico>
{
  constructor(
    @Inject(SERVICO_GATEWAY)
    private readonly gateway: ServicoGateway,
  ) {}

  async execute(input: AtualizarServicoInput): Promise<Servico> {
    const { id, ...props } = input;

    const servico = await this.gateway.findById(id);
    if (!servico) {
      throw new ServicoNotFoundError(id);
    }

    if (props.nome !== undefined) {
      const exists = await this.gateway.existsByNome(props.nome, id);
      if (exists) {
        throw new DuplicateNameError(props.nome);
      }
    }

    servico.update(props);
    return this.gateway.update(servico);
  }
}
