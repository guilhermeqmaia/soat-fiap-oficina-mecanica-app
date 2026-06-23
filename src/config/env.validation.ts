/**
 * Validacao de variaveis de ambiente, executada no boot via
 * `ConfigModule.forRoot({ validate: validateEnv })`. Falha rapido (fail-fast)
 * se a configuracao de seguranca for fraca/ausente — em vez de subir a aplicacao
 * com um segredo inseguro.
 */

const MIN_SECRET_LENGTH = 32;

/** Valores placeholder conhecidos que nunca podem ser usados como segredo real. */
const PLACEHOLDER_SECRETS = new Set([
  'change-me-to-a-strong-random-secret',
  'changeme',
  'change-me',
  'secret',
  'your-secret',
]);

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const jwtSecret = config.JWT_SECRET;

  if (typeof jwtSecret !== 'string' || jwtSecret.length === 0) {
    throw new Error(
      'JWT_SECRET e obrigatorio. Defina-o no ambiente antes de iniciar a aplicacao.',
    );
  }

  if (PLACEHOLDER_SECRETS.has(jwtSecret)) {
    throw new Error(
      'JWT_SECRET nao pode usar um valor placeholder. Gere um segredo forte, ex.: `openssl rand -base64 48`.',
    );
  }

  // Em producao exigimos um segredo forte; em dev/test um valor curto e tolerado
  // para nao atritar o fluxo de desenvolvimento e os testes.
  if (config.NODE_ENV === 'production' && jwtSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET deve ter ao menos ${MIN_SECRET_LENGTH} caracteres em producao. Gere com: \`openssl rand -base64 48\`.`,
    );
  }

  return config;
}
