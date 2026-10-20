import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SAGA_REPOSITORY, SagaRepository } from '../domain/saga.repository';
import { OrquestradorSagaService } from './orquestrador-saga.service';
import { sagasPorStatus } from '../../../observabilidade/metrics.registry';

/**
 * Relogio da saga: varre sagas com prazo de aprovacao/pagamento vencido e
 * entrega `saga.timeout` ao orquestrador (compensacao, US-F4-11). Tambem
 * atualiza a gauge de sagas por status. Desligado com MESSAGING_AUTOSTART=false.
 */
@Injectable()
export class SagaTimeoutsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SagaTimeoutsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(SAGA_REPOSITORY) private readonly sagas: SagaRepository,
    private readonly orquestrador: OrquestradorSagaService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.MESSAGING_AUTOSTART === 'false') return;
    const intervalo = Number(process.env.SAGA_TIMEOUTS_INTERVALO_MS ?? 60_000);
    this.timer = setInterval(() => void this.varrer().catch((e) => this.logger.warn({ msg: 'varredura falhou', erro: (e as Error).message })), intervalo);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Um ciclo: timeouts vencidos -> orquestrador; gauge por status. Devolve quantas sagas expiraram. */
  async varrer(agora: Date = new Date()): Promise<number> {
    const vencidas = await this.sagas.findComPrazoVencido(agora);
    for (const saga of vencidas) {
      try {
        await this.orquestrador.processar({ type: 'saga.timeout', data: { numeroOS: saga.numero, passo: saga.passo } }, agora);
      } catch (e) {
        this.logger.warn({ msg: 'timeout nao aplicado', numeroOS: saga.numero, erro: (e as Error).message });
      }
    }
    const porStatus = await this.sagas.countPorStatus();
    for (const status of ['EM_ANDAMENTO', 'COMPENSANDO', 'CONCLUIDA', 'CANCELADA']) sagasPorStatus.set({ status }, porStatus[status] ?? 0);
    return vencidas.length;
  }
}
