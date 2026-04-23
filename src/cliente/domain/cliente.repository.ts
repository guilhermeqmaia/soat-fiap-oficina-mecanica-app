import { Cliente } from "./cliente.entity";

export interface FindAllParams {
  page: number;
  limit: number;
  nome?: string;
  cpf?: string;
  cnpj?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ClienteRepository {
  existsByCpfCnpj(cpfCnpj: string, excludeId?: string): Promise<boolean>;
  create(cliente: Cliente): Promise<Cliente>;
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<Cliente>>;
  update(cliente: Cliente): Promise<Cliente>;
  delete(id: string): Promise<void>;
}

export const CLIENTE_REPOSITORY = Symbol("ClienteRepository");
