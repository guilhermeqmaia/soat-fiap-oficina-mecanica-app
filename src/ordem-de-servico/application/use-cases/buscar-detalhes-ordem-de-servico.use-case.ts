import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
  USUARIO_CONSULTA_GATEWAY,
  UsuarioConsultaGateway,
  VEICULO_CONSULTA_GATEWAY,
  VeiculoConsultaGateway,
} from '../gateways/consulta.gateways';
import { OsDetalhesView } from '../views/ordem-de-servico-views';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface BuscarDetalhesOrdemDeServicoInput {
  id: string;
}

@Injectable()
export class BuscarDetalhesOrdemDeServicoUseCase implements UseCase<BuscarDetalhesOrdemDeServicoInput, OsDetalhesView> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
    @Inject(VEICULO_CONSULTA_GATEWAY)
    private readonly veiculoGateway: VeiculoConsultaGateway,
    @Inject(USUARIO_CONSULTA_GATEWAY)
    private readonly usuarioGateway: UsuarioConsultaGateway,
  ) {}

  async execute(input: BuscarDetalhesOrdemDeServicoInput): Promise<OsDetalhesView> {
    const os = await carregarOrdemOuFalhar(this.gateway, input.id);

    const [cliente, veiculo, mecanico] = await Promise.all([
      this.clienteGateway.findById(os.clienteId),
      this.veiculoGateway.findById(os.veiculoId),
      os.mecanicoId ? this.usuarioGateway.findById(os.mecanicoId) : Promise.resolve(null),
    ]);

    const servicos = os.itensServico.map((i) => ({
      servicoId: i.servicoId,
      descricaoServico: i.nome,
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      valorTotalDesseServico: i.subtotalServico(),
      produtos: i.produtos.map((p) => ({
        produtoId: p.produtoId,
        descricaoProduto: p.nome,
        quantidade: p.quantidade,
        precoUnitario: p.precoUnitario,
        valorTotalDesseProduto: p.subtotal(),
      })),
    }));

    const valorTotalServicos = os.valorTotalServicos();
    const valorTotalProdutos = os.valorTotalProdutos();

    return {
      cabecalho: {
        numero: os.numero,
        dadosCliente: {
          id: cliente?.id ?? os.clienteId,
          nome: cliente?.nome ?? 'Cliente removido',
          cpfCnpj: cliente?.cpfCnpj?.value ?? '',
          email: cliente?.email ?? null,
          telefone: cliente?.telefone ?? '',
        },
        dadosVeiculo: {
          id: veiculo?.id ?? os.veiculoId,
          placa: veiculo?.placa?.value ?? '',
          marca: veiculo?.marca ?? '',
          modelo: veiculo?.modelo ?? '',
          ano: veiculo?.ano ?? 0,
        },
        status: os.status,
        motivoCancelamento: os.motivoCancelamento,
        mecanicoAtribuido: mecanico?.nome ?? null,
        dataHoraAbertura: this.formatDateTime(os.createdAt),
        dataHoraUltimaAtualizacao: this.formatDateTime(os.updatedAt),
      },
      corpo: {
        descricaoInicial: os.descricaoInicial,
        diagnostico: os.diagnostico,
        servicos,
      },
      rodape: {
        valorTotalServicos,
        valorTotalProdutos,
        valorTotalOrdemServico: valorTotalServicos + valorTotalProdutos,
      },
    };
  }

  private formatDateTime(date: Date | undefined): string | null {
    if (!date) return null;
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
