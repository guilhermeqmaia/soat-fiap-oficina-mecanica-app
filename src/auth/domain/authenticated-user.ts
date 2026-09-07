import { Role } from './role.enum';

/**
 * Principal autenticado da aplicacao (resource server — US-F3-03).
 *
 * Construido EXCLUSIVAMENTE a partir das claims do JWT emitido pela Lambda de
 * autenticacao por CPF (repo soat-fiap-oficina-auth-lambda) — a aplicacao nao
 * consulta banco para autenticar. Para CLIENTE, `id` e o id do cliente; para
 * staff, o id do usuario.
 */
export class AuthenticatedUser {
  constructor(
    readonly id: string,
    readonly nome: string,
    readonly cpf: string | null,
    readonly role: Role,
  ) {}

  hasAnyRole(roles: Role[]): boolean {
    return roles.includes(this.role);
  }

  /** Compara o CPF/CNPJ da claim com um documento normalizado (so digitos). */
  possuiDocumento(cpfCnpj: string): boolean {
    if (!this.cpf) return false;
    return this.cpf.replace(/\D/g, '') === cpfCnpj.replace(/\D/g, '');
  }
}
