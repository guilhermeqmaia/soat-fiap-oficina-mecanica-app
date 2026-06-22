import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
  PRODUTO_CONSULTA_GATEWAY,
  ProdutoConsultaGateway,
  SERVICO_CONSULTA_GATEWAY,
  ServicoConsultaGateway,
  USUARIO_CONSULTA_GATEWAY,
  UsuarioConsultaGateway,
  VEICULO_CONSULTA_GATEWAY,
  VeiculoConsultaGateway,
} from '../gateways/consulta.gateways';
import { OsDetalhesView } from '../views/ordem-de-servico-views';
import {
  carregarNomesProdutos,
  carregarNomesServicos,
} from './carregar-nomes-catalogo';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface BuscarDetalhesOrdemDeServicoInput {
  id: string;
}

@Injectable()
export class BuscarDetalhesOrdemDeServicoUseCase
  implements UseCase<BuscarDetalhesOrdemDeServicoInput, OsDetalhesView>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
    @Inject(VEICULO_CONSULTA_GATEWAY)
    private readonly veiculoGateway: VeiculoConsultaGateway,
    @Inject(USUARIO_CONSULTA_GATEWAY)
    private readonly usuarioGateway: UsuarioConsultaGateway,
    @Inject(SERVICO_CONSULTA_GATEWAY)
    private readonly servicoGateway: ServicoConsultaGateway,
    @Inject(PRODUTO_CONSULTA_GATEWAY)
    private readonly produtoGateway: ProdutoConsultaGateway,
  ) {}

  async execute(
    input: BuscarDetalhesOrdemDeServicoInput,
  ): Promise<OsDetalhesView> {
    const os = await carregarOrdemOuFalhar(this.gateway, input.id);

    const [cliente, veiculo, usuario] = await Promise.all([
      this.clienteGateway.findById(os.clienteId),
      this.veiculoGateway.findById(os.veiculoId),
      os.usuarioId
        ? this.usuarioGateway.findById(os.usuarioId)
        : Promise.resolve(null),
    ]);

    const servicoIds = os.itensServico.map((i) => i.servicoId);
    const produtoIds = os.itensServico.flatMap((i) =>
      i.produtos.map((p) => p.produtoId),
    );
    const [servicoNomeById, produtoNomeById] = await Promise.all([
      carregarNomesServicos(this.servicoGateway, servicoIds),
      carregarNomesProdutos(this.produtoGateway, produtoIds),
    ]);

    const servicos = os.itensServico.map((i) => ({
      servicoId: i.servicoId,
      descricaoServico:
        servicoNomeById.get(i.servicoId) ?? 'Servico removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      valorTotalDesseServico: i.subtotalServico(),
      produtos: i.produtos.map((p) => ({
        produtoId: p.produtoId,
        descricaoProduto:
          produtoNomeById.get(p.produtoId) ?? 'Produto removido do catalogo',
        quantidade: p.quantidade,
        precoUnitario: p.precoUnitario,
        valorTotalDesseProduto: p.subtotal(),
      })),
    }));

    const valorTotalServicos = os.valorTotalServicos();
    const valorTotalProdutos = os.valorTotalProdutos();

    return {
      cabecalho: {
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
        mecanicoAtribuido: usuario?.nome ?? null,
        dataHoraAbertura: this.formatDateTime(os.createdAt),
        dataHoraUltimaAtualizacao: this.formatDateTime(os.updatedAt),
      },
      corpo: {
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
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }
}
