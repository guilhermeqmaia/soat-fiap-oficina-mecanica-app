import { VeiculoRepository } from '../../domain/veiculo.repository';

/**
 * Gateway de persistencia do Veiculo, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaVeiculoRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> VeiculoGateway (port) -> PrismaVeiculoRepository
 */
export type VeiculoGateway = VeiculoRepository;

export const VEICULO_GATEWAY = Symbol('VeiculoGateway');

export { FindAllParams, PaginatedResult } from '../../domain/veiculo.repository';
