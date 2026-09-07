import { InvalidCpfError } from '../errors/invalid-cpf.error';

/**
 * CPF do usuario de staff — chave do login na Lambda de autenticacao
 * (US-F3-03/RFC-0003). Sempre armazenado NORMALIZADO (so digitos), igual ao
 * formato consultado pela Lambda (`usuario.cpf = $1`).
 */
export class Cpf {
  readonly value: string;

  constructor(raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (!Cpf.isValid(cleaned)) {
      throw new InvalidCpfError(raw);
    }
    this.value = cleaned;
  }

  private static isValid(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    for (const position of [9, 10]) {
      let sum = 0;
      for (let i = 0; i < position; i++) {
        sum += Number(cpf[i]) * (position + 1 - i);
      }
      const expected = ((sum * 10) % 11) % 10;
      if (Number(cpf[position]) !== expected) return false;
    }
    return true;
  }
}
