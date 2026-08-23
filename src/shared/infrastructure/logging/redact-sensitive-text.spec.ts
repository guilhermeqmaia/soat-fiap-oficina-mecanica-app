import { redactSensitiveText } from './redact-sensitive-text';

describe('redactSensitiveText', () => {
  it('mascara CPF formatado', () => {
    expect(redactSensitiveText("cliente com o CPF/CNPJ '529.982.247-25'")).toBe(
      "cliente com o CPF/CNPJ '529******25'",
    );
  });

  it('mascara CPF sem formatacao', () => {
    expect(redactSensitiveText('cpf 52998224725 duplicado')).toBe(
      'cpf 529******25 duplicado',
    );
  });

  it('mascara CNPJ sem formatacao (formato interno de CpfCnpj.value)', () => {
    expect(redactSensitiveText('cnpj 11222333000181 ja cadastrado')).toBe(
      'cnpj 112*********81 ja cadastrado',
    );
  });

  it('preserva texto sem documentos', () => {
    expect(redactSensitiveText('Ordem de Servico nao encontrada')).toBe(
      'Ordem de Servico nao encontrada',
    );
  });
});
