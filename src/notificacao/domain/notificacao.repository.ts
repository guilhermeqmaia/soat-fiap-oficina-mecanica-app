import { Notificacao } from './notificacao.entity';

export interface FindAllParams {
  page: number;
  limit: number;
  clienteId?: string;
  ordemDeServicoId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificacaoRepository {
  create(notificacao: Notificacao): Promise<Notificacao>;
  findById(id: string): Promise<Notificacao | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<Notificacao>>;
}

export const NOTIFICACAO_REPOSITORY = Symbol('NotificacaoRepository');
