import { Logger } from '@nestjs/common';
import { EstoqueBaixoListener } from './estoque-baixo.listener';
import { EstoqueBaixoEvent } from '../../domain/events/estoque-baixo.event';

describe('EstoqueBaixoListener', () => {
  let listener: EstoqueBaixoListener;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    listener = new EstoqueBaixoListener();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('loga warning quando recebe EstoqueBaixoEvent', () => {
    listener.handle(
      new EstoqueBaixoEvent('p-1', 'Filtro de oleo', 3, 10),
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0][0] as string;
    expect(message).toContain('Filtro de oleo');
    expect(message).toContain('atual=3');
    expect(message).toContain('minimo=10');
    expect(message).toContain('p-1');
  });
});
