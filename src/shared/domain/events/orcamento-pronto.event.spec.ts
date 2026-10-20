import { OrcamentoProntoEvent } from './orcamento-pronto.event';
import { DomainEvent } from '@guilhermeqmaia/oficina-kit/core';

describe('OrcamentoProntoEvent', () => {
  it('preenche todos os campos do payload', () => {
    const event = new OrcamentoProntoEvent(
      'os-1',
      'OS-2026-001',
      'cliente-1',
      'pastilhas desgastadas',
      450.5,
    );

    expect(event.ordemDeServicoId).toBe('os-1');
    expect(event.numero).toBe('OS-2026-001');
    expect(event.clienteId).toBe('cliente-1');
    expect(event.diagnostico).toBe('pastilhas desgastadas');
    expect(event.valorTotal).toBe(450.5);
  });

  it('preenche occurredAt automaticamente', () => {
    const before = Date.now();
    const event = new OrcamentoProntoEvent('os-1', 'OS-1', 'c-1', 'x', 100);
    const after = Date.now();

    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('eh subclasse de DomainEvent', () => {
    const event = new OrcamentoProntoEvent('os-1', 'OS-1', 'c-1', 'x', 100);
    expect(event).toBeInstanceOf(DomainEvent);
  });

  it('expoe EVENT_NAME estatico estavel', () => {
    expect(OrcamentoProntoEvent.EVENT_NAME).toBe('os.orcamento-pronto');
  });
});
