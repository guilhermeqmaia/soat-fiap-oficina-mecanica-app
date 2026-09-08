import { EventEmitter } from 'node:events';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { MetricsInterceptor } from './infrastructure/metrics.interceptor';
import { MetricsController } from './infrastructure/metrics.controller';
import { OsMetricsListener } from './application/os-metrics.listener';
import { OsStatusAlteradoEvent } from '../ordem-de-servico/domain/events/os-status-alterado.event';
import { StatusOS } from '../ordem-de-servico/domain/value-objects/status-os.vo';
import { registry, httpDuration, osTransicoes, integracaoResultados } from './metrics.registry';
import { iniciarTracing } from './tracing';

/** Resposta fake que emite `finish` como o Express faz ao encerrar a request. */
class FakeResponse extends EventEmitter {
  constructor(public statusCode: number) {
    super();
  }
  finalizar(status = this.statusCode): void {
    this.statusCode = status;
    this.emit('finish');
  }
}

function httpContext(method: string, routePath: string, res: FakeResponse): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ method, route: { path: routePath } }),
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

const handler = (obs: unknown): CallHandler => ({ handle: () => obs as never });

beforeEach(() => {
  httpDuration.reset();
  osTransicoes.reset();
  integracaoResultados.reset();
});

describe('MetricsInterceptor', () => {
  it('mede a latencia usando o PADRAO da rota (nao a URL concreta)', async () => {
    const interceptor = new MetricsInterceptor();
    const res = new FakeResponse(200);

    await lastValueFrom(interceptor.intercept(httpContext('GET', '/clientes/:id', res), handler(of('ok'))));
    res.finalizar();

    const texto = await registry.metrics();
    expect(texto).toContain('route="/clientes/:id"');
    expect(texto).not.toContain('/clientes/123');
  });

  it('usa o status FINAL da resposta, nao o erro lancado pelo handler', async () => {
    // Erro de dominio: o handler lanca, mas o DomainExceptionFilter responde
    // 404. A metrica precisa dizer 404 — rotular 500 inflaria os 5xx.
    const interceptor = new MetricsInterceptor();
    const res = new FakeResponse(200);

    await expect(
      lastValueFrom(
        interceptor.intercept(
          httpContext('GET', '/ordens-servico/numero/:numero/status', res),
          handler(throwError(() => new Error('OrdemDeServico nao encontrada'))),
        ),
      ),
    ).rejects.toBeDefined();
    res.finalizar(404); // filtro global define o status depois do erro

    const texto = await registry.metrics();
    expect(texto).toContain('status="404"');
    expect(texto).not.toContain('status="500"');
  });

  it('ignora contextos nao-HTTP (ex.: listeners de evento)', async () => {
    const interceptor = new MetricsInterceptor();
    const ctx = { getType: () => 'rpc' } as unknown as ExecutionContext;

    await lastValueFrom(interceptor.intercept(ctx, handler(of('ok'))));

    expect(await registry.metrics()).not.toContain('oficina_http_request_duration_seconds_count{');
  });
});

describe('MetricsController', () => {
  it('expoe o registry no formato de scrape', async () => {
    const texto = await new MetricsController().scrape();

    expect(texto).toContain('oficina_http_request_duration_seconds');
    expect(texto).toContain('oficina_process_cpu_user_seconds_total'); // metricas de processo
  });
});

describe('OsMetricsListener', () => {
  it('conta transicoes de status da OS', async () => {
    new OsMetricsListener().onStatusAlterado(
      new OsStatusAlteradoEvent('os-1', 'OS-1', 'cli-1', StatusOS.RECEBIDA, StatusOS.EM_DIAGNOSTICO),
    );

    const texto = await registry.metrics();
    expect(texto).toContain('oficina_os_transicoes_total{de="RECEBIDA",para="EM_DIAGNOSTICO"} 1');
  });

  it('conta resultado das integracoes (insumo do alerta de falha)', async () => {
    OsMetricsListener.registrarIntegracao('webhook-notificacao', 'falha');

    expect(await registry.metrics()).toContain(
      'oficina_integracoes_total{integracao="webhook-notificacao",resultado="falha"} 1',
    );
  });
});

describe('tracing', () => {
  afterEach(() => delete process.env.DD_TRACE_ENABLED);

  it('nao carrega o APM quando DD_TRACE_ENABLED nao esta ligado', () => {
    delete process.env.DD_TRACE_ENABLED;
    expect(() => iniciarTracing()).not.toThrow(); // no-op, sem exigir a dependencia
  });
});
