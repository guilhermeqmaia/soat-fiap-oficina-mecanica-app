const NON_DIGIT_PATTERN = /\D/g;

/**
 * Removes any non-digit characters from a CPF/CNPJ string.
 * Accepts values formatted as "123.456.789-09", "12.345.678/0001-90"
 * or plain digits.
 */
export function normalizeCpfCnpj(value: string): string {
  return value.replace(NON_DIGIT_PATTERN, "");
}
