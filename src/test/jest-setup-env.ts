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
