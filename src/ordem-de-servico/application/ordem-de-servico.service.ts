import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrdemDeServico,
  CreateOrdemDeServicoProps,
} from '../domain/ordem-de-servico.entity';
import {
  OrdemDeServicoRepository,
  ORDEM_DE_SERVICO_REPOSITORY,
  FindAllParams,
  PaginatedResult,
} from '../domain/ordem-de-servico.repository';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { OsNotOwnedByClienteError } from '../domain/errors/os-not-owned-by-cliente.error';
import { ServicoNotFoundInCatalogError } from '../domain/errors/servico-not-found-in-catalog.error';
import { ProdutoNotFoundInCatalogError } from '../domain/errors/produto-not-found-in-catalog.error';
import { OrdemDeServicoNotFoundError } from '../domain/errors/ordem-de-servico-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../domain/errors/cliente-not-owned-by-usuario.error';
import { ItemServicoOS } from '../domain/value-objects/item-servico-os.vo';
import { ItemProdutoOS } from '../domain/value-objects/item-produto-os.vo';
import { OrcamentoProntoEvent } from '../domain/events/orcamento-pronto.event';
import { OsFinalizadaEvent } from '../domain/events/os-finalizada.event';
import { ClienteRepository, CLIENTE_REPOSITORY } from '../../cliente/domain/cliente.repository';
import { VeiculoRepository, VEICULO_REPOSITORY } from '../../veiculo/domain/veiculo.repository';
import { ServicoRepository, SERVICO_REPOSITORY } from '../../servico/domain/servico.repository';
import { ProdutoRepository, PRODUTO_REPOSITORY } from '../../produto/domain/produto.repository';
import { UsuarioRepository, USUARIO_REPOSITORY } from '../../usuario/domain/usuario.repository';

@Injectable()
export class OrdemDeServicoService {
  constructor(
    @Inject(ORDEM_DE_SERVICO_REPOSITORY)
    private readonly repository: OrdemDeServicoRepository,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clienteRepository: ClienteRepository,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculoRepository: VeiculoRepository,
    @Inject(SERVICO_REPOSITORY)
    private readonly servicoRepository: ServicoRepository,
    @Inject(PRODUTO_REPOSITORY)
    private readonly produtoRepository: ProdutoRepository,
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(props: CreateOrdemDeServicoProps): Promise<OrdemDeServico> {
    // Validar se cliente existe
    const cliente = await this.clienteRepository.findById(props.clienteId);
    if (!cliente) {
      throw new ClienteNotFoundError(props.clienteId);
    }

    // Validar se veiculo existe
    const veiculo = await this.veiculoRepository.findById(props.veiculoId);
    if (!veiculo) {
      throw new VeiculoNotFoundError(props.veiculoId);
    }

    // Validar se veiculo pertence ao cliente
    if (veiculo.clienteId !== props.clienteId) {
      throw new VeiculoClienteMismatchError(props.veiculoId, props.clienteId);
    }

    // Criar entidade
    const ordemDeServico = OrdemDeServico.create(props);

    // Salvar
    return this.repository.create(ordemDeServico);
  }

  async findAll(
    params: FindAllParams,
  ): Promise<PaginatedResult<OrdemDeServico>> {
    return this.repository.findAll(params);
  }

  async findById(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.repository.findById(id);
    if (!ordemDeServico) {
      throw new NotFoundException(
        `Ordem de Servico com id '${id}' nao encontrada`,
      );
    }
    return ordemDeServico;
  }

  async findByIdDetalhado(id: string): Promise<OsDetalhesView> {
    const os = await this.findById(id);

    const [cliente, veiculo, usuario] = await Promise.all([
      this.clienteRepository.findById(os.clienteId),
      this.veiculoRepository.findById(os.veiculoId),
      os.usuarioId ? this.usuarioRepository.findById(os.usuarioId) : Promise.resolve(null),
    ]);

    const servicoIds = os.itensServico.map((i) => i.servicoId);
    const produtoIds = os.itensProduto.map((i) => i.produtoId);
    const [servicoNomeById, produtoNomeById] = await Promise.all([
      this.loadServicoNomes(servicoIds),
      this.loadProdutoNomes(produtoIds),
    ]);

    const servicos = os.itensServico.map((i) => ({
      servicoId: i.servicoId,
      descricaoServico: servicoNomeById.get(i.servicoId) ?? 'Servico removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      valorTotalDesseServico: i.subtotal(),
    }));

    const produtos = os.itensProduto.map((i) => ({
      produtoId: i.produtoId,
      descricaoProduto: produtoNomeById.get(i.produtoId) ?? 'Produto removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      valorTotalDesseProduto: i.subtotal(),
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
        produtos,
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

  async atribuirMecanico(
    id: string,
    usuarioId: string,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.atribuirMecanico(usuarioId);
    return this.repository.update(ordemDeServico);
  }

  async completarDiagnostico(
    id: string,
    diagnostico: string,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.completarDiagnostico(diagnostico);
    const updated = await this.repository.update(ordemDeServico);
    this.eventEmitter.emit(
      OrcamentoProntoEvent.EVENT_NAME,
      new OrcamentoProntoEvent(
        updated.id!,
        updated.numero,
        updated.clienteId,
        updated.diagnostico ?? '',
        updated.valorTotalServicos(),
      ),
    );
    return updated;
  }

  async aprovarOrcamento(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.aprovar();
    return this.repository.update(ordemDeServico);
  }

  async rejeitarOrcamento(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.rejeitar();
    return this.repository.update(ordemDeServico);
  }

  async assertOsPertenceAoCliente(
    ordemId: string,
    emailCliente: string,
  ): Promise<void> {
    const ordemDeServico = await this.findById(ordemId);
    const cliente = await this.clienteRepository.findById(
      ordemDeServico.clienteId,
    );
    if (
      !cliente ||
      !cliente.email ||
      cliente.email.toLowerCase() !== emailCliente.toLowerCase()
    ) {
      throw new OsNotOwnedByClienteError(ordemId);
    }
  }

  async iniciarServico(
    osId: string,
    servicoId: string,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(osId);
    ordemDeServico.iniciarServico(servicoId);
    return this.repository.update(ordemDeServico);
  }

  async concluirServico(
    osId: string,
    servicoId: string,
    horasTrabalhadas: number,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(osId);
    ordemDeServico.concluirServico(servicoId, horasTrabalhadas);
    const updated = await this.repository.update(ordemDeServico);
    if (updated.status === 'FINALIZADA') {
      this.eventEmitter.emit(
        OsFinalizadaEvent.EVENT_NAME,
        new OsFinalizadaEvent(updated.id!, updated.numero, updated.clienteId),
      );
    }
    return updated;
  }

  async finalizarExecucao(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.finalizarExecucao();
    const updated = await this.repository.update(ordemDeServico);
    this.eventEmitter.emit(
      OsFinalizadaEvent.EVENT_NAME,
      new OsFinalizadaEvent(updated.id!, updated.numero, updated.clienteId),
    );
    return updated;
  }

  async entregar(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.entregar();
    return this.repository.update(ordemDeServico);
  }

  async delete(id: string): Promise<void> {
    const ordemDeServico = await this.findById(id);
    await this.repository.delete(ordemDeServico.id);
  }

  async adicionarServico(
    id: string,
    servicoId: string,
    quantidade: number,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    const servico = await this.servicoRepository.findById(servicoId);
    if (!servico) {
      throw new ServicoNotFoundInCatalogError(servicoId);
    }
    const item = new ItemServicoOS(
      servicoId,
      quantidade,
      servico.precoBase.value,
    );
    ordemDeServico.adicionarServico(item);
    return this.repository.update(ordemDeServico);
  }

  async removerServico(id: string, servicoId: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.removerServico(servicoId);
    return this.repository.update(ordemDeServico);
  }

  async adicionarProduto(
    id: string,
    produtoId: string,
    quantidade: number,
  ): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    const produto = await this.produtoRepository.findById(produtoId);
    if (!produto) {
      throw new ProdutoNotFoundInCatalogError(produtoId);
    }
    const item = new ItemProdutoOS(
      produtoId,
      quantidade,
      produto.precoUnitario.value,
    );
    ordemDeServico.adicionarProduto(item);
    return this.repository.update(ordemDeServico);
  }

  async removerProduto(id: string, produtoId: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.removerProduto(produtoId);
    return this.repository.update(ordemDeServico);
  }

  async findStatusByNumero(numero: string): Promise<OsStatusView> {
    const ordemDeServico = await this.repository.findByNumero(numero);
    if (!ordemDeServico) {
      throw new OrdemDeServicoNotFoundError(numero);
    }

    const servicoIds = ordemDeServico.itensServico.map((i) => i.servicoId);
    const servicoNomeById = await this.loadServicoNomes(servicoIds);

    const servicos = ordemDeServico.itensServico.map((i) => ({
      servicoId: i.servicoId,
      nome: servicoNomeById.get(i.servicoId) ?? 'Servico removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      subtotal: i.subtotal(),
    }));

    const produtoIds = ordemDeServico.itensProduto.map((i) => i.produtoId);
    const produtoNomeById = await this.loadProdutoNomes(produtoIds);

    const produtos = ordemDeServico.itensProduto.map((i) => ({
      produtoId: i.produtoId,
      nome: produtoNomeById.get(i.produtoId) ?? 'Produto removido do catalogo',
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      subtotal: i.subtotal(),
    }));

    const valorTotalServicos = ordemDeServico.valorTotalServicos();
    const valorTotalProdutos = ordemDeServico.valorTotalProdutos();

    return {
      id: ordemDeServico.id!,
      numero: ordemDeServico.numero,
      status: ordemDeServico.status,
      descricaoInicial: ordemDeServico.descricaoInicial,
      diagnostico: ordemDeServico.diagnostico,
      servicos,
      produtos,
      valorTotalServicos,
      valorTotalProdutos,
      valorTotal: valorTotalServicos + valorTotalProdutos,
      createdAt: ordemDeServico.createdAt,
      updatedAt: ordemDeServico.updatedAt,
    };
  }

  async findByCpfCnpj(
    cpfCnpj: string,
    emailCliente: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<OsHistoryItem>> {
    const cliente = await this.clienteRepository.findByCpfCnpj(cpfCnpj);
    if (!cliente) {
      throw new ClienteNotFoundError(cpfCnpj);
    }
    if (!cliente.email || cliente.email.toLowerCase() !== emailCliente.toLowerCase()) {
      throw new ClienteNotOwnedByUsuarioError(cpfCnpj);
    }
    const result = await this.repository.findAll({
      clienteId: cliente.id,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    });
    return {
      data: result.data.map((os) => ({
        numero: os.numero,
        status: os.status,
        descricaoInicial: os.descricaoInicial,
        createdAt: os.createdAt,
        updatedAt: os.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  private async loadServicoNomes(servicoIds: string[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(servicoIds));
    const map = new Map<string, string>();
    await Promise.all(
      unique.map(async (id) => {
        const s = await this.servicoRepository.findById(id);
        if (s) map.set(id, s.nome);
      }),
    );
    return map;
  }

  private async loadProdutoNomes(produtoIds: string[]): Promise<Map<string, string>> {
    const unique = Array.from(new Set(produtoIds));
    const map = new Map<string, string>();
    await Promise.all(
      unique.map(async (id) => {
        const p = await this.produtoRepository.findById(id);
        if (p) map.set(id, p.nome);
      }),
    );
    return map;
  }
}

export interface OsStatusServico {
  servicoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OsStatusProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OsStatusView {
  id: string;
  numero: string;
  status: string;
  descricaoInicial: string;
  diagnostico: string | null;
  servicos: OsStatusServico[];
  produtos: OsStatusProduto[];
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

export interface OsDetalhesServicoItem {
  servicoId: string;
  descricaoServico: string;
  quantidade: number;
  precoUnitario: number;
  valorTotalDesseServico: number;
}

export interface OsDetalhesProdutoItem {
  produtoId: string;
  descricaoProduto: string;
  quantidade: number;
  precoUnitario: number;
  valorTotalDesseProduto: number;
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
    produtos: OsDetalhesProdutoItem[];
  };
  rodape: {
    valorTotalServicos: number;
    valorTotalProdutos: number;
    valorTotalOrdemServico: number;
  };
}
