import { inicializarSeriesDeNegocio, registry } from "./metrics.registry";

describe("inicializarSeriesDeNegocio", () => {
  it("expoe as series de negocio com 0 antes de qualquer evento", async () => {
    inicializarSeriesDeNegocio();
    const texto = await registry.metrics();
    expect(texto).toContain(
      'oficina_os_transicoes_total{de="RECEBIDA",para="EM_DIAGNOSTICO"} 0',
    );
    expect(texto).toContain(
      'oficina_integracoes_total{integracao="webhook-notificacao",resultado="falha"} 0',
    );
    expect(texto).toContain(
      'oficina_os_tempo_no_status_seconds_count{status="EM_EXECUCAO"} 0',
    );
  });

  it("e idempotente (nao zera contagens ja registradas)", async () => {
    const { osTransicoes } = await import("./metrics.registry");
    osTransicoes.inc({ de: "RECEBIDA", para: "EM_DIAGNOSTICO" });
    inicializarSeriesDeNegocio();
    expect(await registry.metrics()).toContain(
      'oficina_os_transicoes_total{de="RECEBIDA",para="EM_DIAGNOSTICO"} 1',
    );
  });
});
