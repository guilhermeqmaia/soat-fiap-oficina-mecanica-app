import { InvalidCpfCnpjError } from "../errors/invalid-cpf-cnpj.error";
import { normalizeCpfCnpj } from "./cpf-cnpj.utils";

export class CpfCnpj {
  readonly value: string;

  constructor(value: string) {
    const cleaned = normalizeCpfCnpj(value);

    if (!CpfCnpj.isValid(cleaned)) {
      throw new InvalidCpfCnpjError(value);
    }

    this.value = cleaned;
  }

  private static isValid(value: string): boolean {
    if (value.length === 11) {
      return CpfCnpj.isValidCpf(value);
    }
    if (value.length === 14) {
      return CpfCnpj.isValidCnpj(value);
    }
    return false;
  }

  private static isValidCpf(cpf: string): boolean {
    // Rejeitar sequencias com todos os digitos iguais (ex: 111.111.111-11)
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Calcular primeiro digito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    // Calcular segundo digito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private static isValidCnpj(cnpj: string): boolean {
    // Rejeitar sequencias com todos os digitos iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Primeiro digito verificador
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < 12; i++) {
      soma += parseInt(cnpj.charAt(i)) * pesos1[i];
    }
    let resto = soma % 11;
    const dig1 = resto < 2 ? 0 : 11 - resto;
    if (dig1 !== parseInt(cnpj.charAt(12))) return false;

    // Segundo digito verificador
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    soma = 0;
    for (let i = 0; i < 13; i++) {
      soma += parseInt(cnpj.charAt(i)) * pesos2[i];
    }
    resto = soma % 11;
    const dig2 = resto < 2 ? 0 : 11 - resto;
    if (dig2 !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }

  equals(other: CpfCnpj): boolean {
    return this.value === other.value;
  }

  get isCpf(): boolean {
    return this.value.length === 11;
  }

  get isCnpj(): boolean {
    return this.value.length === 14;
  }
}
