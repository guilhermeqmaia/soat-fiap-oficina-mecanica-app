/**
 * View models (Output) produzidos por use cases de consulta da OrdemDeServico.
 * Sao objetos de saida da APLICACAO — independentes de DTO HTTP. Os presenters
 * da camada de interface apenas os repassam ou achatam para a resposta final.
 */

export interface OsStatusProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OsStatusServico {
  servicoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  produtos: OsStatusProduto[];
}

export interface OsStatusView {
  id: string;
  numero: string;
  status: string;
  descricaoInicial: string;
  diagnostico: string | null;
  servicos: OsStatusServico[];
  valorTotalServicos: number;
  valorTotalProdutos: number;
  valorTotal: number;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export interface OsHistoryItem {
  numero: string;
  status: string;
  descricaoInicial: string;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

export interface OsDetalhesClienteView {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string | null | undefined;
  telefone: string;
}

export interface OsDetalhesVeiculoView {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
}

export interface OsDetalhesProdutoItem {
  produtoId: string;
  descricaoProduto: string;
  quantidade: number;
  precoUnitario: number;
  valorTotalDesseProduto: number;
}

export interface OsDetalhesServicoItem {
  servicoId: string;
  descricaoServico: string;
  quantidade: number;
  precoUnitario: number;
  valorTotalDesseServico: number;
  produtos: OsDetalhesProdutoItem[];
}

export interface OsDetalhesView {
  cabecalho: {
    dadosCliente: OsDetalhesClienteView;
    dadosVeiculo: OsDetalhesVeiculoView;
    status: string;
    mecanicoAtribuido: string | null;
    dataHoraAbertura: string | null;
    dataHoraUltimaAtualizacao: string | null;
  };
  corpo: {
    diagnostico: string | null;
    servicos: OsDetalhesServicoItem[];
  };
  rodape: {
    valorTotalServicos: number;
    valorTotalProdutos: number;
    valorTotalOrdemServico: number;
  };
}
