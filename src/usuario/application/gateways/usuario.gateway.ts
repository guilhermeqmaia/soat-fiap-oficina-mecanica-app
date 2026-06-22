import { UsuarioRepository } from '../../domain/usuario.repository';

/**
 * Gateway de persistencia do Usuario, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaUsuarioRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> UsuarioGateway (port) -> PrismaUsuarioRepository
 */
export type UsuarioGateway = UsuarioRepository;

export const USUARIO_GATEWAY = Symbol('UsuarioGateway');

export { FindAllParams, PaginatedResult } from '../../domain/usuario.repository';
