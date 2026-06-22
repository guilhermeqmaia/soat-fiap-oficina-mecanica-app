import { OrdemDeServicoRepository } from '../../domain/ordem-de-servico.repository';

/**
 * Gateway de persistencia da Ordem de Servico, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaOrdemDeServicoRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> OrdemDeServicoGateway (port) -> PrismaOrdemDeServicoRepository
 */
export type OrdemDeServicoGateway = OrdemDeServicoRepository;

export const ORDEM_DE_SERVICO_GATEWAY = Symbol('OrdemDeServicoGateway');

export {
  FindAllParams,
  PaginatedResult,
  TempoMedioFilters,
  TempoMedioExecucaoResult,
  TempoMedioPorServico,
} from '../../domain/ordem-de-servico.repository';
