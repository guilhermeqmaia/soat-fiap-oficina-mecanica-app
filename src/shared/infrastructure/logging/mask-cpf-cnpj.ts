/**
 * Mascara um CPF/CNPJ para uso em logs, mantendo os 3 primeiros e 2 ultimos
 * digitos (ex.: "52998224725" -> "529******25"). Usar sempre que um
 * identificador de documento precisar aparecer em uma linha de log.
 */
export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 5) return '*'.repeat(digits.length);
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 5)}${digits.slice(-2)}`;
}
