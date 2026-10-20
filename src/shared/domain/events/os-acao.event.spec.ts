import { OsAcaoEvent } from './os-acao.event';
import { DomainEvent } from '@guilhermeqmaia/oficina-kit/core';

describe('OsAcaoEvent', () => {
  it('preenche todos os campos do payload', () => {
    const event = new OsAcaoEvent(
      'os-1',
      'OS-2026-001',
      'APROVAR_ORCAMENTO',
      'AGUARDANDO_APROVACAO',
      'EM_EXECUCAO',
      'usuario-7',
      { reason: 'cliente aprovou' },
    );

    expect(event.ordemDeServicoId).toBe('os-1');
    expect(event.numero).toBe('OS-2026-001');
    expect(event.acao).toBe('APROVAR_ORCAMENTO');
    expect(event.statusAnterior).toBe('AGUARDANDO_APROVACAO');
    expect(event.statusNovo).toBe('EM_EXECUCAO');
    expect(event.usuarioId).toBe('usuario-7');
    expect(event.metadata).toEqual({ reason: 'cliente aprovou' });
  });

  it('aceita statusAnterior, statusNovo, usuarioId, metadata como nulls', () => {
    const event = new OsAcaoEvent('os-1', 'OS-1', 'CRIAR', null, null, null);

    expect(event.statusAnterior).toBeNull();
    expect(event.statusNovo).toBeNull();
    expect(event.usuarioId).toBeNull();
    expect(event.metadata).toBeNull();
  });

  it('eh subclasse de DomainEvent com occurredAt automatico', () => {
    const event = new OsAcaoEvent('os-1', 'OS-1', 'CRIAR', null, 'RECEBIDA', null);
    expect(event).toBeInstanceOf(DomainEvent);
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('expoe EVENT_NAME estavel', () => {
    expect(OsAcaoEvent.EVENT_NAME).toBe('os.acao');
  });
});
