import { Cliente } from "./cliente.entity";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClienteRepository {
  create(cliente: Cliente): Promise<Cliente>;
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<Cliente>>;
  update(id: string, data: Partial<Cliente>): Promise<Cliente>;
  softDelete(id: string): Promise<void>;
  hasActiveOrdemDeServico(clienteId: string): Promise<boolean>;
}
