import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Notificacao } from '../../domain/notificacao.entity';
import {
  NOTIFICACAO_GATEWAY,
  NotificacaoGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/notificacao.gateway';

@Injectable()
export class ListarNotificacoesUseCase
  implements UseCase<FindAllParams, PaginatedResult<Notificacao>>
{
  constructor(
    @Inject(NOTIFICACAO_GATEWAY)
    private readonly gateway: NotificacaoGateway,
  ) {}

  async execute(input: FindAllParams): Promise<PaginatedResult<Notificacao>> {
    return this.gateway.findAll(input);
  }
}
