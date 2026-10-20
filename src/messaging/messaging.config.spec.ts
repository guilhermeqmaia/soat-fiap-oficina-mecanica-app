import { messagingModule } from './messaging.config';

describe('messagingModule (OS Service)', () => {
  it('sem SNS_TOPIC_ARN nao registra broker (outbox continua pelo OutboxModule)', () => {
    expect(messagingModule({})).toEqual([]);
  });
  it('com topico registra o MessagingModule; consumer com os 12 handlers so com fila', () => {
    const [soPublica] = messagingModule({ SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:0:oficina-os.fifo', AWS_ENDPOINT: 'http://localhost:4566' });
    expect(soPublica.module.name).toBe('MessagingModule');
    const [completo] = messagingModule({ SNS_TOPIC_ARN: 'arn', SQS_QUEUE_URL: 'http://q/os-eventos.fifo', MESSAGING_AUTOSTART: 'false' });
    expect((completo.providers?.length ?? 0) - (soPublica.providers?.length ?? 0)).toBeGreaterThanOrEqual(12);
  });
});
