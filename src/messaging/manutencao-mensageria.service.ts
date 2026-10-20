import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Purga periodica (ADR-0009, TTL de 7 dias): linhas ENVIADA do outbox e ids em
 * `processed_messages` mais antigos que a retencao. Pendentes/falhas ficam
 * (sao o que o poller e a triagem humana precisam). Desligada com
 * MESSAGING_AUTOSTART=false (testes); `purgar()` fica exposto para chamada direta.
 */
@Injectable()
export class ManutencaoMensageriaService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ManutencaoMensageriaService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    if (process.env.MESSAGING_AUTOSTART === 'false') return;
    const intervalo = Number(process.env.MESSAGING_PURGA_INTERVALO_MS ?? 60 * 60 * 1000);
    this.timer = setInterval(
      () => void this.purgar().catch((e) => this.logger.warn({ msg: 'purga falhou', erro: (e as Error).message })),
      intervalo,
    );
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Remove o que ja cumpriu a retencao; devolve as contagens apagadas. */
  async purgar(retencaoDias = Number(process.env.MESSAGING_RETENCAO_DIAS ?? 7)): Promise<{ outbox: number; processed: number }> {
    const limite = new Date(Date.now() - retencaoDias * DIA_MS);
    const [outbox, processed] = await Promise.all([
      this.prisma.outbox.deleteMany({ where: { status: 'ENVIADA', enviadaEm: { lt: limite } } }),
      this.prisma.processedMessage.deleteMany({ where: { processadaEm: { lt: limite } } }),
    ]);
    if (outbox.count || processed.count) {
      this.logger.log({ msg: 'purga de mensageria', outbox: outbox.count, processed: processed.count, retencaoDias });
    }
    return { outbox: outbox.count, processed: processed.count };
  }
}
