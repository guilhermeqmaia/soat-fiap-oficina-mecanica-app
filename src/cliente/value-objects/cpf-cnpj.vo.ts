export class CpfCnpj {
  private readonly value: string;

  private constructor(value: string) {
    this.value = CpfCnpj.sanitize(value);
  }

  static create(value: string): CpfCnpj {
    const sanitized = CpfCnpj.sanitize(value);

    if (CpfCnpj.isCpf(sanitized)) {
      if (!CpfCnpj.validateCpf(sanitized)) {
        throw new Error("CPF invalido");
      }
    } else if (CpfCnpj.isCnpj(sanitized)) {
      if (!CpfCnpj.validateCnpj(sanitized)) {
        throw new Error("CNPJ invalido");
      }
    } else {
      throw new Error("Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos");
    }

    return new CpfCnpj(sanitized);
  }

  getValue(): string {
    return this.value;
  }

  private static sanitize(value: string): string {
    return value.replace(/\D/g, "");
  }

  private static isCpf(value: string): boolean {
    return value.length === 11;
  }

  private static isCnpj(value: string): boolean {
    return value.length === 14;
  }

  private static validateCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private static validateCnpj(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }
}
