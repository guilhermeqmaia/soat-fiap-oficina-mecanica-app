import { Produto } from './produto.entity';

export interface FindAllParams {
  page: number;
  limit: number;
  nome?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProdutoRepository {
  existsByNome(nome: string, excludeId?: string): Promise<boolean>;
  create(produto: Produto): Promise<Produto>;
  findById(id: string): Promise<Produto | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<Produto>>;
  findLowStock(): Promise<Produto[]>;
  update(produto: Produto): Promise<Produto>;
  delete(id: string): Promise<void>;
}

export const PRODUTO_REPOSITORY = Symbol('ProdutoRepository');
