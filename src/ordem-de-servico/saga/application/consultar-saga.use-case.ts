import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { SagaNotFoundError } from '../domain/errors/saga-not-found.error';
import { SagaOS } from '../domain/saga-os.entity';
import { SAGA_REPOSITORY, SagaRepository } from '../domain/saga.repository';

@Injectable()
export class ConsultarSagaUseCase implements UseCase<{ numero: string }, SagaOS> {
  constructor(@Inject(SAGA_REPOSITORY) private readonly sagas: SagaRepository) {}

  async execute(input: { numero: string }): Promise<SagaOS> {
    const saga = await this.sagas.findByNumero(input.numero);
    if (!saga) throw new SagaNotFoundError(input.numero);
    return saga;
  }
}
