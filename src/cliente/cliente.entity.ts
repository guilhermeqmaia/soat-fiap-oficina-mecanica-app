import { CpfCnpj } from "./value-objects/cpf-cnpj.vo";

export interface ClienteProps {
  id?: string;
  nome: string;
  cpfCnpj: string;
  email?: string;
  telefone: string;
  endereco?: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Cliente {
  readonly id?: string;
  readonly nome: string;
  readonly cpfCnpj: CpfCnpj;
  readonly email?: string;
  readonly telefone: string;
  readonly endereco?: string;
  readonly ativo: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  private constructor(props: ClienteProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.cpfCnpj = CpfCnpj.create(props.cpfCnpj);
    this.email = props.email;
    this.telefone = props.telefone;
    this.endereco = props.endereco;
    this.ativo = props.ativo ?? true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: ClienteProps): Cliente {
    if (!props.nome || props.nome.trim().length === 0) {
      throw new Error("Nome e obrigatorio");
    }
    if (!props.telefone || props.telefone.trim().length === 0) {
      throw new Error("Telefone e obrigatorio");
    }
    return new Cliente(props);
  }

  getCpfCnpjValue(): string {
    return this.cpfCnpj.getValue();
  }
}
