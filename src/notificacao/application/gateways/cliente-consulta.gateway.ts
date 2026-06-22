import { Cliente } from '../../../cliente/domain/cliente.entity';

/**
 * Gateway de CONSULTA ao contexto de Cliente.
 *
 * O contexto de Notificacao precisa apenas VERIFICAR se o cliente existe e se
 * o email corresponde ao autenticado. Define apenas o metodo minimo necessario
 * (anti-corruption layer). O adapter e ligado no modulo ao repositorio Prisma
 * ja existente via `useExisting`.
 */
export interface ClienteConsultaGateway {
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
}

export const CLIENTE_CONSULTA_GATEWAY = Symbol('ClienteConsultaGateway');
