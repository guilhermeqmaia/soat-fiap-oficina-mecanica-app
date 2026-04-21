import { CpfCnpj } from "./value-objects/cpf-cnpj.vo";
import { NameRequiredError } from "./errors/name-required.error";
import { PhoneRequiredError } from "./errors/phone-required.error";

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

  private constructor(
    props: {
      nome: string;
      cpfCnpj: CpfCnpj;
      telefone: string;
      email?: string | null;
    },
    id?: string,
  ) {
    this.id = id;
    this._nome = props.nome;
    this._cpfCnpj = props.cpfCnpj;
    this._telefone = props.telefone;
    this._email = props.email;
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
    });
  }

  static reconstitute(props: ReconstituteClienteProps): Cliente {
    return new Cliente(
      {
        nome: props.nome,
        cpfCnpj: new CpfCnpj(props.cpfCnpj),
        telefone: props.telefone,
        email: props.email,
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

  // Validacoes
  private static validateNome(nome: string): void {
    if (!nome || nome.trim().length === 0) {
      throw new NameRequiredError();
    }
  }

  private static validateTelefone(telefone: string): void {
    if (!telefone || telefone.trim().length === 0) {
      throw new PhoneRequiredError();
    }
  }
}
