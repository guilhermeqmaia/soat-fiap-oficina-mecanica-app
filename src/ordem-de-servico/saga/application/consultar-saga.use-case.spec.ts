import { ConsultarSagaUseCase } from './consultar-saga.use-case';
import { SagaNotFoundError } from '../domain/errors/saga-not-found.error';
import { SagaOS } from '../domain/saga-os.entity';
import { SagaPresenter } from '../infrastructure/saga.presenter';

describe('ConsultarSagaUseCase + SagaPresenter', () => {
  const saga = SagaOS.iniciar({ numero: 'OS-1', clienteId: 'c', veiculoId: 'v', descricaoProblema: 'd' }, new Date('2026-10-21T10:00:00Z'));
  it('devolve a saga pelo numero e 404 quando nao existe', async () => {
    const repo = { findByNumero: jest.fn(async (n: string) => (n === 'OS-1' ? saga : null)) } as any;
    expect(await new ConsultarSagaUseCase(repo).execute({ numero: 'OS-1' })).toBe(saga);
    await expect(new ConsultarSagaUseCase(repo).execute({ numero: 'OS-2' })).rejects.toThrow(SagaNotFoundError);
  });
  it('presenter expoe passo, status, historico, compensacoes e prazos', () => {
    expect(SagaPresenter.toResponse(saga)).toMatchObject({
      numero: 'OS-1', passo: 'ENFILEIRAR_EXECUCAO', status: 'EM_ANDAMENTO', prazoAprovacao: null, prazoPagamento: null, compensacoes: [],
      historico: [{ evento: 'os.aberta', resultado: 'avancou' }],
    });
  });
});
