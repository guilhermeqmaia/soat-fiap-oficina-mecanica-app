/**
 * Shape plano de saida de um Usuario.
 * Definido na camada de aplicacao para ser compartilhado entre
 * use cases e o presenter de infraestrutura.
 */
export interface UsuarioOutput {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
