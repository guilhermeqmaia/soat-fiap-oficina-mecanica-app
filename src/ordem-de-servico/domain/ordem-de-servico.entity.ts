import { StatusOS, StatusOSVO } from './value-objects/status-os.vo';
import { ItemServicoOS } from './value-objects/item-servico-os.vo';
import { ItemProdutoOS } from './value-objects/item-produto-os.vo';
import { InvalidDescriptionError } from './errors/invalid-description.error';
import { InvalidStatusTransitionError } from './errors/invalid-status-transition.error';
import { ServicoAlreadyAddedError } from './errors/servico-already-added.error';
import { ServicoNotAddedError } from './errors/servico-not-added.error';
import { ProdutoAlreadyAddedError } from './errors/produto-already-added.error';
import { ProdutoNotAddedError } from './errors/produto-not-added.error';
import { ItemServicoInvalidStatusError } from './errors/item-servico-invalid-status.error';

export interface CreateOrdemDeServicoProps {
  clienteId: string;
  veiculoId: string;
  descricaoInicial: string;
}

export interface ReconstituteOrdemDeServicoProps {
  id: string;
  numero: string;
  clienteId: string;
  veiculoId: string;
  usuarioId: string | null;
  descricaoInicial: string;
  diagnostico: string | null;
  status: StatusOS;
  createdAt: Date;
  updatedAt: Date;
  itensServico?: ItemServicoOS[];
  itensProduto?: ItemProdutoOS[];
}

export class OrdemDeServico {
  readonly id?: string;
  private _numero: string;
  private _clienteId: string;
  private _veiculoId: string;
  private _usuarioId: string | null;
  private _descricaoInicial: string;
  private _diagnostico: string | null;
  private _status: StatusOSVO;
  private _itensServico: ItemServicoOS[];
  private _itensProduto: ItemProdutoOS[];
  private _createdAt?: Date;
  private _updatedAt?: Date;

  private constructor(
    props: {
      numero: string;
      clienteId: string;
      veiculoId: string;
      usuarioId: string | null;
      descricaoInicial: string;
      diagnostico: string | null;
      status: StatusOSVO;
      itensServico?: ItemServicoOS[];
      itensProduto?: ItemProdutoOS[];
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: string,
  ) {
    this.id = id;
    this._numero = props.numero;
    this._clienteId = props.clienteId;
    this._veiculoId = props.veiculoId;
    this._usuarioId = props.usuarioId;
    this._descricaoInicial = props.descricaoInicial;
    this._diagnostico = props.diagnostico;
    this._status = props.status;
    this._itensServico = props.itensServico ?? [];
    this._itensProduto = props.itensProduto ?? [];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: CreateOrdemDeServicoProps): OrdemDeServico {
    OrdemDeServico.validateDescricaoInicial(props.descricaoInicial);

    const numero = this.gerarNumeroOS();

    return new OrdemDeServico({
      numero,
      clienteId: props.clienteId,
      veiculoId: props.veiculoId,
      usuarioId: null,
      descricaoInicial: props.descricaoInicial,
      diagnostico: null,
      status: StatusOSVO.create(StatusOS.RECEBIDA),
    });
  }

  static reconstitute(props: ReconstituteOrdemDeServicoProps): OrdemDeServico {
    return new OrdemDeServico(
      {
        numero: props.numero,
        clienteId: props.clienteId,
        veiculoId: props.veiculoId,
        usuarioId: props.usuarioId,
        descricaoInicial: props.descricaoInicial,
        diagnostico: props.diagnostico,
        status: StatusOSVO.create(props.status),
        itensServico: props.itensServico,
        itensProduto: props.itensProduto,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
      props.id,
    );
  }

  private static validateDescricaoInicial(descricao: string): void {
    if (!descricao || descricao.trim().length < 5) {
      throw new InvalidDescriptionError(
        'Descricao inicial deve ter no minimo 5 caracteres',
      );
    }
    if (descricao.length > 500) {
      throw new InvalidDescriptionError(
        'Descricao inicial nao pode exceder 500 caracteres',
      );
    }
  }

  private static gerarNumeroOS(): string {
    const ano = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `OS-${ano}-${timestamp}-${random}`;
  }

  atribuirMecanico(usuarioId: string): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.RECEBIDA))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.EM_DIAGNOSTICO,
      );
    }
    this._usuarioId = usuarioId;
    this._status = StatusOSVO.create(StatusOS.EM_DIAGNOSTICO);
  }

  completarDiagnostico(diagnostico: string): void {
    if (!diagnostico || diagnostico.trim().length < 5) {
      throw new InvalidDescriptionError(
        'Diagnostico deve ter no minimo 5 caracteres',
      );
    }
    if (diagnostico.length > 1000) {
      throw new InvalidDescriptionError(
        'Diagnostico nao pode exceder 1000 caracteres',
      );
    }
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.AGUARDANDO_APROVACAO,
      );
    }
    this._diagnostico = diagnostico;
    this._status = StatusOSVO.create(StatusOS.AGUARDANDO_APROVACAO);
  }

  adicionarServico(item: ItemServicoOS): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'adicionar servico',
      );
    }
    if (this._itensServico.some((i) => i.servicoId === item.servicoId)) {
      throw new ServicoAlreadyAddedError(item.servicoId);
    }
    this._itensServico = [...this._itensServico, item];
  }

  removerServico(servicoId: string): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'remover servico',
      );
    }
    if (!this._itensServico.some((i) => i.servicoId === servicoId)) {
      throw new ServicoNotAddedError(servicoId);
    }
    this._itensServico = this._itensServico.filter(
      (i) => i.servicoId !== servicoId,
    );
  }

  adicionarProduto(item: ItemProdutoOS): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'adicionar produto',
      );
    }
    if (this._itensProduto.some((i) => i.produtoId === item.produtoId)) {
      throw new ProdutoAlreadyAddedError(item.produtoId);
    }
    this._itensProduto = [...this._itensProduto, item];
  }

  removerProduto(produtoId: string): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'remover produto',
      );
    }
    if (!this._itensProduto.some((i) => i.produtoId === produtoId)) {
      throw new ProdutoNotAddedError(produtoId);
    }
    this._itensProduto = this._itensProduto.filter(
      (i) => i.produtoId !== produtoId,
    );
  }

  aprovar(): void {
    if (
      !this._status.equals(StatusOSVO.create(StatusOS.AGUARDANDO_APROVACAO))
    ) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.EM_EXECUCAO,
      );
    }
    this._status = StatusOSVO.create(StatusOS.EM_EXECUCAO);
  }

  rejeitar(): void {
    if (
      !this._status.equals(StatusOSVO.create(StatusOS.AGUARDANDO_APROVACAO))
    ) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.CANCELADA,
      );
    }
    this._status = StatusOSVO.create(StatusOS.CANCELADA);
  }

  iniciarServico(servicoId: string): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_EXECUCAO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'iniciar servico',
      );
    }
    const idx = this._itensServico.findIndex((i) => i.servicoId === servicoId);
    if (idx === -1) {
      throw new ServicoNotAddedError(servicoId);
    }
    const item = this._itensServico[idx];
    if (item.statusExecucao !== 'PENDENTE') {
      throw new ItemServicoInvalidStatusError(
        servicoId,
        item.statusExecucao,
        'iniciar',
      );
    }
    const updated = [...this._itensServico];
    updated[idx] = item.iniciar();
    this._itensServico = updated;
  }

  concluirServico(servicoId: string, horasTrabalhadas: number): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_EXECUCAO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        'concluir servico',
      );
    }
    if (horasTrabalhadas <= 0) {
      throw new Error('Horas trabalhadas deve ser maior que zero');
    }
    const idx = this._itensServico.findIndex((i) => i.servicoId === servicoId);
    if (idx === -1) {
      throw new ServicoNotAddedError(servicoId);
    }
    const item = this._itensServico[idx];
    if (item.statusExecucao !== 'EM_EXECUCAO') {
      throw new ItemServicoInvalidStatusError(
        servicoId,
        item.statusExecucao,
        'concluir',
      );
    }
    const updated = [...this._itensServico];
    updated[idx] = item.concluir(horasTrabalhadas);
    this._itensServico = updated;

    const todosConcluidos = this._itensServico.every(
      (i) => i.statusExecucao === 'CONCLUIDO',
    );
    if (todosConcluidos) {
      this._status = StatusOSVO.create(StatusOS.FINALIZADA);
    }
  }

  finalizarExecucao(): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_EXECUCAO))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.FINALIZADA,
      );
    }
    this._status = StatusOSVO.create(StatusOS.FINALIZADA);
  }

  entregar(): void {
    if (!this._status.equals(StatusOSVO.create(StatusOS.FINALIZADA))) {
      throw new InvalidStatusTransitionError(
        this._status.toString(),
        StatusOS.ENTREGUE,
      );
    }
    this._status = StatusOSVO.create(StatusOS.ENTREGUE);
  }

  get numero(): string {
    return this._numero;
  }

  get clienteId(): string {
    return this._clienteId;
  }

  get veiculoId(): string {
    return this._veiculoId;
  }

  get usuarioId(): string | null {
    return this._usuarioId;
  }

  get descricaoInicial(): string {
    return this._descricaoInicial;
  }

  get diagnostico(): string | null {
    return this._diagnostico;
  }

  get status(): StatusOS {
    return this._status.valor;
  }

  get itensServico(): ReadonlyArray<ItemServicoOS> {
    return this._itensServico;
  }

  get itensProduto(): ReadonlyArray<ItemProdutoOS> {
    return this._itensProduto;
  }

  valorTotalServicos(): number {
    return this._itensServico.reduce((sum, i) => sum + i.subtotal(), 0);
  }

  valorTotalProdutos(): number {
    return this._itensProduto.reduce((sum, i) => sum + i.subtotal(), 0);
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
