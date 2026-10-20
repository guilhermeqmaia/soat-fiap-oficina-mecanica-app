import { Injectable } from '@nestjs/common';
import { PrismaOutboxRepository, PrismaProcessedMessageStore } from '@guilhermeqmaia/oficina-kit/messaging';
import { PrismaService } from '../prisma/prisma.service';

/** Outbox transacional do OS Service (tabela `outbox`, ADR-0009). */
@Injectable()
export class PrismaOutbox extends PrismaOutboxRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}

/** Deduplicacao do consumidor da fila `os-eventos` (tabela `processed_messages`). */
@Injectable()
export class PrismaProcessed extends PrismaProcessedMessageStore {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
