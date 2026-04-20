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
import { ClienteRepository, CLIENTE_REPOSITORY } from '../../cliente/domain/cliente.repository';
import { VeiculoRepository, VEICULO_REPOSITORY } from '../../veiculo/domain/veiculo.repository';
import { ProdutoService } from '../../produto/application/produto.service';

@Injectable()
export class OrdemDeServicoService {
  constructor(
    @Inject(ORDEM_DE_SERVICO_REPOSITORY)
    private readonly repository: OrdemDeServicoRepository,
    @Inject(CLIENTE_REPOSITORY)
    private readonly clienteRepository: ClienteRepository,
    @Inject(VEICULO_REPOSITORY)
    private readonly veiculoRepository: VeiculoRepository,
    private readonly produtoService: ProdutoService,
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

  async adicionarProduto(
    ordemDeServicoId: string,
    produtoId: string,
    quantidade: number,
  ): Promise<OrdemDeServico> {
    // Garante que a OS existe (lanca NotFoundException se nao)
    await this.findById(ordemDeServicoId);

    // Garante que o produto existe e obtem o preco atual (snapshot)
    const produto = await this.produtoService.findById(produtoId);

    await this.repository.adicionarItemProduto({
      ordemDeServicoId,
      produtoId,
      quantidade,
      valorUnitario: produto.precoUnitario.value,
    });

    return this.findById(ordemDeServicoId);
  }

  async removerProduto(
    ordemDeServicoId: string,
    produtoId: string,
  ): Promise<OrdemDeServico> {
    await this.findById(ordemDeServicoId);
    await this.repository.removerItemProduto(ordemDeServicoId, produtoId);
    return this.findById(ordemDeServicoId);
  }
}
