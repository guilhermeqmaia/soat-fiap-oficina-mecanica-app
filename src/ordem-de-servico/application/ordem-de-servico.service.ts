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
}
