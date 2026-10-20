/**
 * Roda ANTES de qualquer import de modulo de teste (jest `setupFiles`).
 *
 * Garante que variaveis de ambiente sensiveis existam antes de o `AppModule`
 * ser importado — o `validateEnv` do `ConfigModule.forRoot` executa no momento
 * do import, e o CI nao tem arquivo `.env`. Sem isto, specs que importam o
 * AppModule (ex.: app.module.spec.ts) falham com "JWT_SECRET e obrigatorio".
 *
 * Usa `??=` para nao sobrescrever valores reais ja definidos pelo ambiente.
 */
process.env.JWT_SECRET ??= 'test-jwt-secret-ci-0123456789abcdef-strong';
process.env.NODE_ENV ??= 'test';
// Mensageria (US-F4-06): registra MessagingModule + handlers da fila, mas com
// poller/consumer parados — os e2e exercitam os handlers diretamente e leem a
// tabela `outbox`. Nenhuma chamada de rede ao LocalStack/AWS acontece.
process.env.SNS_TOPIC_ARN ??= 'arn:aws:sns:us-east-1:000000000000:oficina-os.fifo';
process.env.SQS_QUEUE_URL ??= 'http://localhost:4566/000000000000/os-eventos.fifo';
process.env.AWS_ENDPOINT ??= 'http://localhost:4566';
process.env.AWS_REGION ??= 'us-east-1';
process.env.MESSAGING_AUTOSTART ??= 'false';
