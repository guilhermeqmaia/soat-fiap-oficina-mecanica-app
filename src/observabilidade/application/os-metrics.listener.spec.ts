import { OsMetricsListener } from './os-metrics.listener';
import { OsStatusAlteradoEvent } from '../../ordem-de-servico/domain/events/os-status-alterado.event';
import { StatusOS } from '../../ordem-de-servico/domain/value-objects/status-os.vo';
import { integracaoResultados, osTransicoes, registry } from '../metrics.registry';

beforeEach(() => {
  osTransicoes.reset();
  integracaoResultados.reset();
});

describe('OsMetricsListener', () => {
  it('conta transicoes de status da OS', async () => {
    new OsMetricsListener().onStatusAlterado(
      new OsStatusAlteradoEvent('os-1', 'OS-1', 'cli-1', StatusOS.RECEBIDA, StatusOS.EM_DIAGNOSTICO),
    );
    expect(await registry.metrics()).toContain(
      'oficina_os_transicoes_total{de="RECEBIDA",para="EM_DIAGNOSTICO"} 1',
    );
  });

  it('conta resultado das integracoes (insumo do alerta de falha)', async () => {
    OsMetricsListener.registrarIntegracao('webhook-notificacao', 'falha');
    expect(await registry.metrics()).toContain(
      'oficina_integracoes_total{integracao="webhook-notificacao",resultado="falha"} 1',
    );
  });

  it('as metricas de negocio vivem no registry unico do kit (mesmo /metrics da latencia HTTP)', async () => {
    const texto = await registry.metrics();
    expect(texto).toContain('oficina_http_request_duration_seconds');
    expect(texto).toContain('oficina_os_transicoes_total');
  });
});
