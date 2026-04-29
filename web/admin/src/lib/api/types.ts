// Tipos minimos para o frontend (alinhados com a API NestJS)

export type StatusOS =
  | 'RECEBIDA'
  | 'EM_DIAGNOSTICO'
  | 'AGUARDANDO_APROVACAO'
  | 'EM_EXECUCAO'
  | 'FINALIZADA'
  | 'ENTREGUE'
  | 'CANCELADA';

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email?: string | null;
}

export interface Veiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  clienteId: string;
  ativo?: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  precoBase: number;
  tempoEstimadoHoras: number;
  ativo: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  precoUnitario: number;
  quantidadeEstoque: number;
  quantidadeReservada: number;
  quantidadeDisponivel?: number;
  estoqueMinimo: number;
  ativo: boolean;
  alertaEstoqueBaixo?: boolean;
}

export type TipoMovimentacaoEstoque =
  | 'ENTRADA'
  | 'SAIDA'
  | 'RESERVA'
  | 'ESTORNO_RESERVA'
  | 'BAIXA';

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  estoqueResultante: number;
  ordemDeServicoId: string | null;
  motivo: string | null;
  usuarioId: string | null;
  createdAt: string;
}

export interface ItemServicoOS {
  servicoId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface OrdemDeServico {
  id: string;
  numero: string;
  clienteId: string;
  veiculoId: string;
  usuarioId: string | null;
  descricaoInicial: string;
  diagnostico: string | null;
  status: StatusOS;
  itensServico: ItemServicoOS[];
  valorTotalServicos?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'ADMIN' | 'ATENDENTE' | 'MECANICO' | 'ESTOQUISTA' | 'CLIENTE';
  ativo: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
