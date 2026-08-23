/**
 * Ultima linha de defesa contra vazamento de dados sensiveis em logs:
 * mascara sequencias que parecem CPF/CNPJ dentro de uma mensagem de texto
 * livre (ex.: mensagens de `DomainError` que interpolam o documento do
 * cliente). Complementa a redacao por path do pino (que cobre campos
 * estruturados como headers/body), cobrindo o caso de strings compostas.
 *
 * Cobre digitos crus (11/14 digitos, formato interno de `CpfCnpj.value`) e o
 * formato tradicional de CPF (`999.999.999-99`), mantendo os 3 primeiros e
 * os 2 ultimos digitos, ex.: "52998224725" -> "529******25".
 */
const CPF_CNPJ_RE = /\b(?:\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}|\d{14})\b/g;

export function redactSensitiveText(text: string): string {
  return text.replace(CPF_CNPJ_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 5)}${digits.slice(-2)}`;
  });
}
