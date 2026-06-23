/**
 * Porta de saida para hashing/verificacao de senhas.
 *
 * Os use cases dependem apenas desta interface; o adapter concreto
 * (`BcryptPasswordHasher`) encapsula o bcrypt. Assim a criptografia (um driver)
 * fica fora do anel de aplicacao, respeitando a Regra de Dependencia.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
