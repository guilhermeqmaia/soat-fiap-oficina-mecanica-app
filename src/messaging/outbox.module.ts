import { Global, Module } from '@nestjs/common';
import { OUTBOX_REPOSITORY } from '@guilhermeqmaia/oficina-kit/messaging';
import { PrismaOutbox } from './prisma-messaging.adapters';

/**
 * O outbox existe SEMPRE (e so uma tabela): os repositorios gravam os eventos
 * `os.*` na transacao mesmo sem broker configurado. Quem esvazia a tabela e o
 * OutboxPoller do MessagingModule — ligado apenas com SNS_TOPIC_ARN
 * (ver messaging.config.ts).
 */
@Global()
@Module({
  providers: [PrismaOutbox, { provide: OUTBOX_REPOSITORY, useExisting: PrismaOutbox }],
  exports: [OUTBOX_REPOSITORY],
})
export class OutboxModule {}
