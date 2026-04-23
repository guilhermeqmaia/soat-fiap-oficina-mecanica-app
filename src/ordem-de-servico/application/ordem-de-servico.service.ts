import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { OrdemDeServicoNotFoundError } from '../domain/errors/ordem-de-servico-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../domain/errors/cliente-not-owned-by-usuario.error';
import { ItemServicoOS } from '../domain/value-objects/item-servico-os.vo';
import { ClienteRepository, CLIENTE_REPOSITORY } from '../../cliente/domain/cliente.repository';
import { VeiculoRepository, VEICULO_REPOSITORY } from '../../veiculo/domain/veiculo.repository';
import { ServicoRepository, SERVICO_REPOSITORY } from '../../servico/domain/servico.repository';

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
    return this.repository.update(ordemDeServico);
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

  async finalizarExecucao(id: string): Promise<OrdemDeServico> {
    const ordemDeServico = await this.findById(id);
    ordemDeServico.finalizarExecucao();
    return this.repository.update(ordemDeServico);
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

    const valorTotalServicos = ordemDeServico.valorTotalServicos();
    const valorTotalProdutos = 0;

    return {
      numero: ordemDeServico.numero,
      status: ordemDeServico.status,
      descricaoInicial: ordemDeServico.descricaoInicial,
      diagnostico: ordemDeServico.diagnostico,
      servicos,
      produtos: [],
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
}

export interface OsStatusServico {
  servicoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface OsStatusView {
  numero: string;
  status: string;
  descricaoInicial: string;
  diagnostico: string | null;
  servicos: OsStatusServico[];
  produtos: unknown[];
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
