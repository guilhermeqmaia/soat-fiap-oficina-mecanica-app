import { CpfCnpj } from "./value-objects/cpf-cnpj.vo";
import { NomeRequiredError } from "./errors/nome-required.error";
import { TelefoneRequiredError } from "./errors/telefone-required.error";

export interface CreateClienteProps {
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email?: string;
}

export interface ReconstituteClienteProps {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email?: string | null;
  ativo: boolean;
}

export interface UpdateClienteProps {
  nome?: string;
  telefone?: string;
  email?: string;
}

export class Cliente {
  readonly id?: string;
  private _nome: string;
  private _cpfCnpj: CpfCnpj;
  private _telefone: string;
  private _email?: string | null;
  private _ativo: boolean;

  private constructor(
    props: {
      nome: string;
      cpfCnpj: CpfCnpj;
      telefone: string;
      email?: string | null;
      ativo: boolean;
    },
    id?: string,
  ) {
    this.id = id;
    this._nome = props.nome;
    this._cpfCnpj = props.cpfCnpj;
    this._telefone = props.telefone;
    this._email = props.email;
    this._ativo = props.ativo;
  }

  static create(props: CreateClienteProps): Cliente {
    Cliente.validateNome(props.nome);
    Cliente.validateTelefone(props.telefone);
    // CpfCnpj VO valida internamente no constructor
    return new Cliente({
      nome: props.nome,
      cpfCnpj: new CpfCnpj(props.cpfCnpj),
      telefone: props.telefone,
      email: props.email,
      ativo: true,
    });
  }

  static reconstitute(props: ReconstituteClienteProps): Cliente {
    return new Cliente(
      {
        nome: props.nome,
        cpfCnpj: new CpfCnpj(props.cpfCnpj),
        telefone: props.telefone,
        email: props.email,
        ativo: props.ativo,
      },
      props.id,
    );
  }

  update(props: UpdateClienteProps): void {
    if (props.nome !== undefined) {
      Cliente.validateNome(props.nome);
      this._nome = props.nome;
    }
    if (props.telefone !== undefined) {
      Cliente.validateTelefone(props.telefone);
      this._telefone = props.telefone;
    }
    if (props.email !== undefined) {
      this._email = props.email;
    }
  }

  deactivate(): void {
    this._ativo = false;
  }

  activate(): void {
    this._ativo = true;
  }

  // Getters
  get nome(): string {
    return this._nome;
  }
  get cpfCnpj(): CpfCnpj {
    return this._cpfCnpj;
  }
  get telefone(): string {
    return this._telefone;
  }
  get email(): string | null | undefined {
    return this._email;
  }
  get ativo(): boolean {
    return this._ativo;
  }

  // Validacoes
  private static validateNome(nome: string): void {
    if (!nome || nome.trim().length === 0) {
      throw new NomeRequiredError();
    }
  }

  private static validateTelefone(telefone: string): void {
    if (!telefone || telefone.trim().length === 0) {
      throw new TelefoneRequiredError();
    }
  }
}
