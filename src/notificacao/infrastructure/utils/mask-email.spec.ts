import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('mantem 2 primeiros chars do local e mascara o resto', () => {
    expect(maskEmail('joao@oficina.com')).toBe('jo**@oficina.com');
  });

  it('preserva o dominio', () => {
    expect(maskEmail('cliente@example.com.br')).toBe('cl*****@example.com.br');
  });

  it('lida com local de 1 char', () => {
    expect(maskEmail('a@b.com')).toBe('a*@b.com');
  });

  it('retorna *** quando nao tem @', () => {
    expect(maskEmail('semarroba')).toBe('***');
  });

  it('retorna *** quando @ no inicio', () => {
    expect(maskEmail('@dominio.com')).toBe('***');
  });
});
