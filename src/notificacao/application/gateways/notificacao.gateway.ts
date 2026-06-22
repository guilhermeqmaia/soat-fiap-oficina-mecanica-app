import { NotificacaoRepository } from '../../domain/notificacao.repository';

/**
 * Gateway de persistencia de Notificacao, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaNotificacaoRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> NotificacaoGateway (port) -> PrismaNotificacaoRepository
 */
export type NotificacaoGateway = NotificacaoRepository;

export const NOTIFICACAO_GATEWAY = Symbol('NotificacaoGateway');

export { FindAllParams, PaginatedResult } from '../../domain/notificacao.repository';
