/**
 * Paths (sintaxe pino/fast-redact) censurados em toda linha de log emitida
 * pela aplicacao. Cobre headers de autenticacao/sessao e campos de
 * corpo/query que porventura sejam logados por serializers customizados —
 * nunca token, senha ou segredo em texto claro (US-F3-09).
 */
export const REDACT_PATHS: string[] = [
  'headers.authorization',
  'headers.cookie',
  'headers["x-api-key"]',
  '*.password',
  '*.senha',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.jwtSecret',
  '*.NOTIFICATION_WEBHOOK_SECRET',
];
