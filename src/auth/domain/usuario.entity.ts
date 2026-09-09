import { NameRequiredError } from './errors/name-required.error';
import { Role } from './role.enum';
import { Cpf } from './value-objects/cpf.vo';
import { Email } from './value-objects/email.vo';

export interface CreateUsuarioProps {
  nome: string;
  email: string;
  /** CPF do staff — chave do login na Lambda (US-F3-03); opcional para legado. */
  cpf?: string | null;
  senhaHash: string;
  role: Role;
}

export interface ReconstituteUsuarioProps {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  senhaHash: string;
  role: Role;
  ativo: boolean;
}

export class Usuario {
  readonly id?: string;
  private _nome: string;
  private _email: Email;
  private _cpf: Cpf | null;
  private _senhaHash: string;
  private _role: Role;
  private _ativo: boolean;

  private constructor(
    props: {
      nome: string;
      email: Email;
      cpf: Cpf | null;
      senhaHash: string;
      role: Role;
      ativo: boolean;
    },
    id?: string,
  ) {
    this.id = id;
    this._nome = props.nome;
    this._email = props.email;
    this._cpf = props.cpf;
    this._senhaHash = props.senhaHash;
    this._role = props.role;
    this._ativo = props.ativo;
  }

  static create(props: CreateUsuarioProps): Usuario {
    Usuario.validateNome(props.nome);

    return new Usuario({
      nome: props.nome,
      email: new Email(props.email),
      cpf: props.cpf ? new Cpf(props.cpf) : null,
      senhaHash: props.senhaHash,
      role: props.role,
      ativo: true,
    });
  }

  static reconstitute(props: ReconstituteUsuarioProps): Usuario {
    return new Usuario(
      {
        nome: props.nome,
        email: new Email(props.email),
        cpf: props.cpf ? new Cpf(props.cpf) : null,
        senhaHash: props.senhaHash,
        role: props.role,
        ativo: props.ativo,
      },
      props.id,
    );
  }

  hasRole(role: Role): boolean {
    return this._role === role;
  }

  hasAnyRole(roles: Role[]): boolean {
    return roles.includes(this._role);
  }

  deactivate(): void {
    this._ativo = false;
  }

  activate(): void {
    this._ativo = true;
  }

  get nome(): string { return this._nome; }
  get email(): Email { return this._email; }
  get cpf(): string | null { return this._cpf?.value ?? null; }
  get senhaHash(): string { return this._senhaHash; }
  get role(): Role { return this._role; }
  get ativo(): boolean { return this._ativo; }

  private static validateNome(nome: string): void {
    if (!nome || nome.trim().length === 0) {
      throw new NameRequiredError();
    }
  }
}
