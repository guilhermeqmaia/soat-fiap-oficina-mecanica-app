import { DynamicModule } from '@nestjs/common';
import { MessagingModule } from '@guilhermeqmaia/oficina-kit/messaging';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdemDeServicoModule } from '../ordem-de-servico/ordem-de-servico.module';
import { OS_MESSAGE_HANDLERS } from '../ordem-de-servico/infrastructure/messaging';
import { PrismaOutbox, PrismaProcessed } from './prisma-messaging.adapters';

/**
 * Mensageria do OS Service (RFC-0006 / ADR-0009):
 * - publica `os.*` no topico `oficina-os.fifo` (OutboxPoller -> SNS);
 * - consome a fila `os-eventos.fifo` (eventos de Execucao e Billing) com dedup.
 *
 * Sem SNS_TOPIC_ARN sobe sem broker (unitarios, dev sem LocalStack): o outbox
 * continua sendo gravado, so nao e esvaziado. MESSAGING_AUTOSTART=false mantem
 * poller e consumer parados (e2e: handlers sao exercitados diretamente).
 */
export function messagingModule(env: NodeJS.ProcessEnv = process.env): DynamicModule[] {
  if (!env.SNS_TOPIC_ARN) return [];
  const autoStart = env.MESSAGING_AUTOSTART !== 'false';
  return [
    MessagingModule.forRoot({
      aws: {
        region: env.AWS_REGION,
        endpoint: env.AWS_ENDPOINT || undefined,
        credentials: env.AWS_ENDPOINT
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID ?? 'test', secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? 'test' }
          : undefined,
      },
      topicArn: env.SNS_TOPIC_ARN,
      outboxRepository: PrismaOutbox,
      poller: { autoStart, intervaloMs: Number(env.OUTBOX_INTERVALO_MS ?? 500) },
      imports: [PrismaModule, OrdemDeServicoModule],
      consumer: env.SQS_QUEUE_URL
        ? {
            queueUrl: env.SQS_QUEUE_URL,
            autoStart,
            processedMessageStore: PrismaProcessed,
            handlers: [...OS_MESSAGE_HANDLERS],
          }
        : undefined,
    }),
  ];
}
