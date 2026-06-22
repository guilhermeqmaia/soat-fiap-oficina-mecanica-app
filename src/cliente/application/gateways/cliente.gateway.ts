import { ClienteRepository } from '../../domain/cliente.repository';

/**
 * Gateway de persistencia do Cliente, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaClienteRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> ClienteGateway (port) -> PrismaClienteRepository
 */
export type ClienteGateway = ClienteRepository;

export const CLIENTE_GATEWAY = Symbol('ClienteGateway');

export { FindAllParams, PaginatedResult } from '../../domain/cliente.repository';
