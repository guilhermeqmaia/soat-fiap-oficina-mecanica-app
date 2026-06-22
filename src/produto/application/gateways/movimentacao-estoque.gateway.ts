import { MovimentacaoEstoqueRepository } from '../../domain/movimentacao-estoque.repository';

/**
 * Gateway de persistencia da MovimentacaoEstoque, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaMovimentacaoEstoqueRepository`) o satisfaz.
 *
 *   Use Case -> MovimentacaoEstoqueGateway (port) -> PrismaMovimentacaoEstoqueRepository
 */
export type MovimentacaoEstoqueGateway = MovimentacaoEstoqueRepository;

export const MOVIMENTACAO_ESTOQUE_GATEWAY = Symbol('MovimentacaoEstoqueGateway');

export {
  FindMovimentacoesParams,
  PaginatedResult,
} from '../../domain/movimentacao-estoque.repository';
