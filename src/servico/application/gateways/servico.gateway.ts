import { ServicoRepository } from '../../domain/servico.repository';

/**
 * Gateway de persistencia do Servico, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaServicoRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> ServicoGateway (port) -> PrismaServicoRepository
 */
export type ServicoGateway = ServicoRepository;

export const SERVICO_GATEWAY = Symbol('ServicoGateway');

export { FindAllParams, PaginatedResult } from '../../domain/servico.repository';
