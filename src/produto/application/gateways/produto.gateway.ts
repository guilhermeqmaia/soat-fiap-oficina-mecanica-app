import { ProdutoRepository } from '../../domain/produto.repository';

/**
 * Gateway de persistencia do Produto, consumido pelos use cases.
 *
 * O contrato e o mesmo da porta de repositorio do dominio; o adapter Prisma
 * (`PrismaProdutoRepository`) o satisfaz. Os use cases dependem deste
 * token de gateway, nunca do Prisma diretamente:
 *
 *   Use Case -> ProdutoGateway (port) -> PrismaProdutoRepository
 */
export type ProdutoGateway = ProdutoRepository;

export const PRODUTO_GATEWAY = Symbol('ProdutoGateway');

export { FindAllParams, PaginatedResult } from '../../domain/produto.repository';
