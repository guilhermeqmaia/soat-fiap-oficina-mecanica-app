import { Cliente } from '../../../cliente/domain/cliente.entity';
import { Veiculo } from '../../../veiculo/domain/veiculo.entity';
import { Usuario } from '../../../auth/domain/usuario.entity';

/**
 * Gateways de CONSULTA (somente leitura) aos contextos que continuam NESTE
 * servico: Cliente, Veiculo e Usuario (staff). Catalogo e Estoque vivem no
 * Execucao Service — a OS recebe seus dados por evento, como snapshot.
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

export interface UsuarioConsultaGateway {
  findById(id: string): Promise<Usuario | null>;
}
export const USUARIO_CONSULTA_GATEWAY = Symbol('UsuarioConsultaGateway');
