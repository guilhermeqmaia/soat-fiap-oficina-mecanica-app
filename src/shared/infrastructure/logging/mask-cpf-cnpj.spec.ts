import { maskCpfCnpj } from './mask-cpf-cnpj';

describe('maskCpfCnpj', () => {
  it('mascara CPF (11 digitos)', () => {
    expect(maskCpfCnpj('52998224725')).toBe('529******25');
  });

  it('mascara CNPJ (14 digitos)', () => {
    expect(maskCpfCnpj('11222333000181')).toBe('112*********81');
  });

  it('ignora formatacao antes de mascarar', () => {
    expect(maskCpfCnpj('529.982.247-25')).toBe('529******25');
  });

  it('mascara totalmente valores muito curtos', () => {
    expect(maskCpfCnpj('123')).toBe('***');
  });
});
