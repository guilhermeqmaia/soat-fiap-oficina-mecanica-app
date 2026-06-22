import { Cliente } from '../../../cliente/domain/cliente.entity';

/**
 * Gateway de CONSULTA ao contexto de Cliente.
 *
 * O contexto de Veiculo (Atendimento) precisa apenas verificar a existencia
 * de um cliente por ID. Em vez de depender da porta de repositorio completa,
 * define um gateway minimo (somente leitura) — anti-corruption layer. O adapter
 * e ligado, no modulo, ao repositorio Prisma ja existente via `useExisting`.
 */
export interface ClienteConsultaGateway {
  findById(id: string): Promise<Cliente | null>;
}

export const CLIENTE_CONSULTA_GATEWAY = Symbol('ClienteConsultaGateway');
