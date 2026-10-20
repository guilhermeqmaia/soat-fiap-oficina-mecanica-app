import { Logger } from '@nestjs/common';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../domain/value-objects/status-os.vo';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { InvalidStatusTransitionError } from '../../domain/errors/invalid-status-transition.error';
import { PassoSaga, SagaOS, StatusSaga } from '../domain/saga-os.entity';
import { OrquestradorSagaService, prazosDoAmbiente } from './orquestrador-saga.service';
import { SagaTimeoutsService } from './saga-timeouts.service';

/** Repositorio em memoria que reproduz o contrato (save grava comandos "no outbox"). */
function fakeRepo() {
  const store = new Map<string, SagaOS>();
  const outbox: Array<{ type: string; data: unknown }> = [];
  return {
    store, outbox,
    findByNumero: jest.fn(async (n: string) => store.get(n) ?? null),
    save: jest.fn(async (s: SagaOS) => {
      for (const c of s.consumirComandos()) outbox.push({ type: c.type, data: c.data });
      const salva = SagaOS.reconstitute({
        id: s.id ?? 'id-' + s.numero, numero: s.numero, clienteId: s.clienteId, veiculoId: s.veiculoId, descricaoProblema: s.descricaoProblema,
        passo: s.passo, status: s.status, historico: [...s.historico], compensacoes: [...s.compensacoes], prazoAprovacao: s.prazoAprovacao,
        prazoPagamento: s.prazoPagamento, version: s.version + 1, createdAt: s.createdAt ?? new Date(), updatedAt: new Date(),
      });
      store.set(s.numero, salva); return salva;
    }),
    findComPrazoVencido: jest.fn(async (agora: Date) => [...store.values()].filter((s) => s.status === StatusSaga.EM_ANDAMENTO && ((s.prazoAprovacao && s.prazoAprovacao <= agora) || (s.prazoPagamento && s.prazoPagamento <= agora)))),
    countPorStatus: jest.fn(async () => { const r: Record<string, number> = {}; for (const s of store.values()) r[s.status] = (r[s.status] ?? 0) + 1; return r; }),
  };
}
const uc = () => ({ execute: jest.fn().mockResolvedValue(undefined) });
const ordem = (status = StatusOS.RECEBIDA) =>
  OrdemDeServico.reconstitute({ id: 'os-1', numero: 'OS-1', clienteId: 'cli-1', veiculoId: 'vei-1', mecanicoId: null, descricaoInicial: 'Barulho ao frenar', diagnostico: null, status, motivoCancelamento: null, createdAt: new Date(), updatedAt: new Date(), itensServico: [] });

describe('OrquestradorSagaService', () => {
  let repo: ReturnType<typeof fakeRepo>; let ucs: Record<string, ReturnType<typeof uc>>; let ordens: any; let svc: OrquestradorSagaService;
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    repo = fakeRepo();
    ucs = { enfileiramento: uc(), diagnostico: uc(), orcamentoGerado: uc(), orcamentoAprovado: uc(), execucaoIniciada: uc(), execucaoFinalizada: uc(), cancelamento: uc() };
    ordens = { findByNumero: jest.fn(async () => null) };
    svc = new OrquestradorSagaService(repo as any, ordens, ucs.enfileiramento as any, ucs.diagnostico as any, ucs.orcamentoGerado as any, ucs.orcamentoAprovado as any, ucs.execucaoIniciada as any, ucs.execucaoFinalizada as any, ucs.cancelamento as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('iniciar cria a saga e grava execucao.enfileirar no outbox; repetir nao duplica', async () => {
    const s = await svc.iniciar(ordem(), { descricaoProblema: 'Barulho ao frenar' });
    expect(s.passo).toBe(PassoSaga.ENFILEIRAR_EXECUCAO);
    expect(repo.outbox).toEqual([{ type: 'execucao.enfileirar', data: { numeroOS: 'OS-1', veiculoId: 'vei-1', descricaoProblema: 'Barulho ao frenar' } }]);
    await svc.iniciar(ordem(), { descricaoProblema: 'x' });
    expect(repo.outbox).toHaveLength(1);
  });

  it('processar: aplica a transicao na OS pelo use case certo e grava os comandos', async () => {
    await svc.iniciar(ordem(), { descricaoProblema: 'd' });
    await svc.processar({ type: 'execucao.enfileirada', id: 'e1', data: { numeroOS: 'OS-1', posicaoFila: 1 } });
    expect(ucs.enfileiramento.execute).toHaveBeenCalledWith({ numero: 'OS-1' });
    const itens = [{ tipo: 'SERVICO', referenciaId: 's', nome: 'n', quantidade: 1, precoUnitario: '1.00' }];
    await svc.processar({ type: 'execucao.diagnostico-concluido', id: 'e2', data: { numeroOS: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas', itens } });
    expect(ucs.diagnostico.execute).toHaveBeenCalledWith({ numero: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas', itens });
    expect(repo.outbox.map((o) => o.type)).toEqual(['execucao.enfileirar', 'billing.gerar-orcamento']);
    await svc.processar({ type: 'billing.orcamento-gerado', id: 'e3', data: { numeroOS: 'OS-1', total: '1.00' } });
    expect(ucs.orcamentoGerado.execute).toHaveBeenCalledWith({ numero: 'OS-1', total: '1.00' });
    await svc.processar({ type: 'billing.orcamento-aprovado', id: 'e4', data: { numeroOS: 'OS-1' } });
    await svc.processar({ type: 'billing.pagamento-aprovado', id: 'e5', data: { numeroOS: 'OS-1' } });
    expect(repo.outbox.map((o) => o.type)).toContain('execucao.iniciar');
    await svc.processar({ type: 'execucao.iniciada', id: 'e6', data: { numeroOS: 'OS-1' } });
    const fim = await svc.processar({ type: 'execucao.finalizada', id: 'e7', data: { numeroOS: 'OS-1' } });
    expect(ucs.execucaoFinalizada.execute).toHaveBeenCalledWith({ numero: 'OS-1', causationId: 'e7' });
    expect(fim.status).toBe(StatusSaga.CONCLUIDA);
  });

  it('evento ignorado: nao toca a OS, mas persiste o historico', async () => {
    await svc.iniciar(ordem(), { descricaoProblema: 'd' });
    const s = await svc.processar({ type: 'execucao.iniciada', id: 'x', data: { numeroOS: 'OS-1' } });
    expect(ucs.execucaoIniciada.execute).not.toHaveBeenCalled();
    expect(s.historico[s.historico.length - 1].resultado).toBe('ignorado');
  });

  it('compensacao: cancela a OS com motivo e causationId e envia os comandos', async () => {
    await svc.iniciar(ordem(), { descricaoProblema: 'd' });
    await svc.processar({ type: 'execucao.enfileirada', id: 'e1', data: { numeroOS: 'OS-1' } });
    await svc.processar({ type: 'execucao.diagnostico-concluido', id: 'e2', data: { numeroOS: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas', itens: [] } });
    await svc.processar({ type: 'billing.orcamento-gerado', id: 'e3', data: { numeroOS: 'OS-1', total: '1.00' } });
    const s = await svc.processar({ type: 'billing.orcamento-rejeitado', id: 'e4', data: { numeroOS: 'OS-1' } });
    expect(ucs.cancelamento.execute).toHaveBeenCalledWith({ numero: 'OS-1', motivo: MotivoCancelamento.ORCAMENTO_REJEITADO, causationId: 'e4' });
    expect(s.status).toBe(StatusSaga.COMPENSANDO);
    expect(repo.outbox[repo.outbox.length - 1].type).toBe('execucao.liberar-reservas');
    const fim = await svc.processar({ type: 'execucao.reservas-liberadas', id: 'e5', data: { numeroOS: 'OS-1' } });
    expect(fim.status).toBe(StatusSaga.CANCELADA);
  });

  it('cancelamento manual rejeitado depois da execucao lanca transicao invalida', async () => {
    await svc.iniciar(ordem(), { descricaoProblema: 'd' });
    for (const [t, d] of [['execucao.enfileirada', {}], ['execucao.diagnostico-concluido', { mecanicoId: 'm', diagnostico: 'Pastilhas', itens: [] }], ['billing.orcamento-gerado', { total: '1.00' }], ['billing.orcamento-aprovado', {}], ['billing.pagamento-aprovado', {}], ['execucao.iniciada', {}]] as const) {
      await svc.processar({ type: t, id: t, data: { numeroOS: 'OS-1', ...d } });
    }
    await expect(svc.processar({ type: 'os.cancelamento-manual', data: { numeroOS: 'OS-1', motivo: MotivoCancelamento.OPERADOR } })).rejects.toThrow(InvalidStatusTransitionError);
    expect(ucs.cancelamento.execute).not.toHaveBeenCalled();
  });

  it('OS sem saga e adotada a partir do status; OS inexistente -> NOT_FOUND', async () => {
    ordens.findByNumero.mockResolvedValueOnce(ordem(StatusOS.EM_EXECUCAO));
    const s = await svc.processar({ type: 'execucao.finalizada', id: 'f', data: { numeroOS: 'OS-1' } });
    expect(s.status).toBe(StatusSaga.CONCLUIDA);
    expect(ucs.execucaoFinalizada.execute).toHaveBeenCalled();
    await expect(svc.processar({ type: 'execucao.finalizada', data: { numeroOS: 'OS-404' } })).rejects.toThrow(OrdemDeServicoNotFoundError);
  });

  it('prazosDoAmbiente: dias/horas ou override em ms', () => {
    expect(prazosDoAmbiente({})).toEqual({ aprovacaoMs: 3 * 86400000, pagamentoMs: 24 * 3600000 });
    expect(prazosDoAmbiente({ SAGA_TIMEOUT_APROVACAO_DIAS: '1', SAGA_TIMEOUT_PAGAMENTO_MS: '5000' })).toEqual({ aprovacaoMs: 86400000, pagamentoMs: 5000 });
  });

  describe('SagaTimeoutsService', () => {
    it('varrer entrega saga.timeout as sagas vencidas e atualiza a gauge', async () => {
      process.env.SAGA_TIMEOUT_APROVACAO_MS = '1000';
      await svc.iniciar(ordem(), { descricaoProblema: 'd' });
      await svc.processar({ type: 'execucao.enfileirada', id: '1', data: { numeroOS: 'OS-1' } });
      await svc.processar({ type: 'execucao.diagnostico-concluido', id: '2', data: { numeroOS: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas', itens: [] } });
      const t0 = new Date();
      await svc.processar({ type: 'billing.orcamento-gerado', id: '3', data: { numeroOS: 'OS-1', total: '1.00' } }, t0);
      const relogio = new SagaTimeoutsService(repo as any, svc);
      expect(await relogio.varrer(new Date(t0.getTime() + 500))).toBe(0);
      expect(await relogio.varrer(new Date(t0.getTime() + 1500))).toBe(1);
      expect(ucs.cancelamento.execute).toHaveBeenCalledWith(expect.objectContaining({ motivo: MotivoCancelamento.TIMEOUT_APROVACAO }));
      expect(repo.store.get('OS-1')?.status).toBe(StatusSaga.COMPENSANDO);
      delete process.env.SAGA_TIMEOUT_APROVACAO_MS;
    });
    it('nao agenda com MESSAGING_AUTOSTART=false; agenda e limpa o timer caso contrario', () => {
      const r = new SagaTimeoutsService(repo as any, svc);
      const old = process.env.MESSAGING_AUTOSTART;
      process.env.MESSAGING_AUTOSTART = 'false'; r.onApplicationBootstrap(); expect((r as any).timer).toBeUndefined();
      delete process.env.MESSAGING_AUTOSTART; r.onApplicationBootstrap(); expect((r as any).timer).toBeDefined(); r.onApplicationShutdown();
      process.env.MESSAGING_AUTOSTART = old;
    });
  });
});
