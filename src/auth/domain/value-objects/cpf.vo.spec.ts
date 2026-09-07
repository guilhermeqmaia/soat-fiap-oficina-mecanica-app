import { Cpf } from './cpf.vo';
import { InvalidCpfError } from '../errors/invalid-cpf.error';

describe('Cpf (VO do login staff — US-F3-03)', () => {
  it('aceita CPF valido e armazena normalizado (so digitos)', () => {
    expect(new Cpf('529.982.247-25').value).toBe('52998224725');
    expect(new Cpf('52998224725').value).toBe('52998224725');
  });

  it.each([
    ['52998224724', 'segundo digito verificador errado'],
    ['52998224735', 'primeiro digito verificador errado'],
    ['11111111111', 'todos os digitos iguais'],
    ['123', 'curto demais'],
    ['123456789012', 'longo demais'],
    ['', 'vazio'],
  ])('rejeita %s (%s) com InvalidCpfError', (raw) => {
    expect(() => new Cpf(raw)).toThrow(InvalidCpfError);
  });

  it('a mensagem do erro carrega o valor rejeitado', () => {
    expect(() => new Cpf('123')).toThrow('CPF invalido: 123');
  });
});
