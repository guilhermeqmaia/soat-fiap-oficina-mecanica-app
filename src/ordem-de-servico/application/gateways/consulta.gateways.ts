import { Cliente } from '../../../cliente/domain/cliente.entity';
import { Veiculo } from '../../../veiculo/domain/veiculo.entity';
import { Servico } from '../../../servico/domain/servico.entity';
import { Produto } from '../../../produto/domain/produto.entity';
import { Usuario } from '../../../auth/domain/usuario.entity';

/**
 * Gateways de CONSULTA a outros bounded contexts.
 *
 * O contexto de Atendimento (OrdemDeServico) precisa apenas LER dados de
 * Catalogo, Estoque, Cliente, Veiculo e Autenticacao. Em vez de depender das
 * portas de repositorio completas de cada contexto, define gateways minimos
 * (somente leitura) — anti-corruption layer. Os adapters sao ligados, no
 * modulo, aos repositorios Prisma ja existentes via `useExisting`.
 */

export interface ClienteConsultaGateway {
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
}
export const CLIENTE_CONSULTA_GATEWAY = Symbol('ClienteConsultaGateway');

export interface VeiculoConsultaGateway {
  findById(id: string): Promise<Veiculo | null>;
}
export const VEICULO_CONSULTA_GATEWAY = Symbol('VeiculoConsultaGateway');

export interface ServicoConsultaGateway {
  findById(id: string): Promise<Servico | null>;
}
export const SERVICO_CONSULTA_GATEWAY = Symbol('ServicoConsultaGateway');

export interface ProdutoConsultaGateway {
  findById(id: string): Promise<Produto | null>;
}
export const PRODUTO_CONSULTA_GATEWAY = Symbol('ProdutoConsultaGateway');

export interface UsuarioConsultaGateway {
  findById(id: string): Promise<Usuario | null>;
}
export const USUARIO_CONSULTA_GATEWAY = Symbol('UsuarioConsultaGateway');
