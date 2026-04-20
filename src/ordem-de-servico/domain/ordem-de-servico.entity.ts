import { StatusOS, StatusOSVO } from './value-objects/status-os.vo';
import { InvalidDescricaoError } from './errors/invalid-descricao.error';
import { InvalidStatusTransitionError } from './errors/invalid-status-transition.error';
import { OsNaoEmDiagnosticoError } from './errors/os-nao-em-diagnostico.error';

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
  diagnosticoAt?: Date | null;
  status: StatusOS;
  createdAt: Date;
  updatedAt: Date;
}

export class OrdemDeServico {
  readonly id?: string;
  private _numero: string;
  private _clienteId: string;
  private _veiculoId: string;
  private _usuarioId: string | null;
  private _descricaoInicial: string;
  private _diagnostico: string | null;
  private _diagnosticoAt: Date | null;
  private _status: StatusOSVO;
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
      diagnosticoAt: Date | null;
      status: StatusOSVO;
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
    this._diagnosticoAt = props.diagnosticoAt;
    this._status = props.status;
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
      diagnosticoAt: null,
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
        diagnosticoAt: props.diagnosticoAt ?? null,
        status: StatusOSVO.create(props.status),
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
      props.id,
    );
  }

  private static validateDescricaoInicial(descricao: string): void {
    if (!descricao || descricao.trim().length < 5) {
      throw new InvalidDescricaoError(
        'Descricao inicial deve ter no minimo 5 caracteres',
      );
    }
    if (descricao.length > 500) {
      throw new InvalidDescricaoError(
        'Descricao inicial nao pode exceder 500 caracteres',
      );
    }
  }

  private static gerarNumeroOS(): string {
    const ano = new Date().getFullYear();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `OS-${ano}-${String(random).padStart(5, '0')}`;
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

  adicionarDiagnostico(diagnostico: string): void {
    if (!diagnostico || diagnostico.trim().length < 5) {
      throw new InvalidDescricaoError(
        'Diagnostico deve ter no minimo 5 caracteres',
      );
    }
    if (diagnostico.length > 1000) {
      throw new InvalidDescricaoError(
        'Diagnostico nao pode exceder 1000 caracteres',
      );
    }
    if (!this._status.equals(StatusOSVO.create(StatusOS.EM_DIAGNOSTICO))) {
      throw new OsNaoEmDiagnosticoError(this._status.toString());
    }
    this._diagnostico = diagnostico;
    this._diagnosticoAt = new Date();
  }

  completarDiagnostico(diagnostico: string): void {
    if (!diagnostico || diagnostico.trim().length < 5) {
      throw new InvalidDescricaoError(
        'Diagnostico deve ter no minimo 5 caracteres',
      );
    }
    if (diagnostico.length > 1000) {
      throw new InvalidDescricaoError(
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

  get diagnosticoAt(): Date | null {
    return this._diagnosticoAt;
  }

  get status(): StatusOS {
    return this._status.valor;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }
}
