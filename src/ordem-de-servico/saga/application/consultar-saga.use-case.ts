import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { SagaOS } from '../domain/saga-os.entity';
import { SAGA_REPOSITORY, SagaRepository } from '../domain/saga.repository';

@Injectable()
export class ConsultarSagaUseCase implements UseCase<{ numero: string }, SagaOS> {
  constructor(@Inject(SAGA_REPOSITORY) private readonly sagas: SagaRepository) {}

  async execute(input: { numero: string }): Promise<SagaOS> {
    const saga = await this.sagas.findByNumero(input.numero);
    if (!saga) throw new OrdemDeServicoNotFoundError(input.numero);
    return saga;
  }
}
