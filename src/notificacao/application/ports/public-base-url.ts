/**
 * URL publica base do sistema, ja resolvida e normalizada na borda (o modulo
 * a obtem da configuracao via `ConfigService`). O listener recebe o valor
 * pronto, sem depender do framework de configuracao (`@nestjs/config`).
 */
export const PUBLIC_BASE_URL = Symbol('PublicBaseUrl');
