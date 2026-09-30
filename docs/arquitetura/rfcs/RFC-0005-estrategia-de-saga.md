# RFC-0005: Estratégia de Saga — orquestração vs coreografia

**Status:** Aceita
**Data:** 2026-09-30
**Autores:** Time SOAT
**Stories relacionadas:** [US-F4-10](../../user-stories/f4-10-saga-orquestrada.md), [US-F4-11](../../user-stories/f4-11-compensacoes-rollback.md), [US-F4-12](../../user-stories/f4-12-notificacoes-por-eventos.md)

## Contexto

O ciclo de vida da OS agora atravessa três serviços e três bancos:
abrir OS → enfileirar → diagnóstico → orçamento → aprovação → **pagamento** →
execução → finalização → entrega. O enunciado exige Saga Pattern com
**rollback e compensação em qualquer etapa** e a justificativa da escolha no
README. O vídeo precisa demonstrar "execução do Saga Pattern e tratamento de
falhas" e "rastreamento dos fluxos distribuídos".

Insights de mercado: o iFood modela o pedido como **máquina de estados** num
único dono (*Gateway Core*) e só depois propaga eventos; a AWS recomenda
coreografia "quando há poucos participantes" e orquestração "quando há muitos e
é necessário acoplamento fraco", alertando que o orquestrador pode virar ponto
único de falha; a Uber **abandonou** uma saga propose/commit/cancel no
Fulfillment porque "entre operações o sistema ficava internamente inconsistente
e depurar ficou ainda mais difícil" — o estado da saga não era explícito.

## Opções consideradas

### Opção A — Coreografia (cada serviço reage a eventos dos outros)

- ✅ Sem componente central; menor acoplamento; simples com 3 participantes
- ❌ O fluxo tem **8 passos e 4 cenários de compensação cruzada** (cancelar orçamento + liberar reservas + estornar); em coreografia cada participante precisa saber reagir a falhas dos outros — a lógica de compensação fica espalhada e implícita
- ❌ Não há lugar natural para **timeouts** (orçamento sem resposta, pagamento pendente)
- ❌ "Onde está a OS 123 agora?" exige correlacionar logs de três serviços — exatamente a dor da Uber

### Opção B — Orquestração com orquestrador no OS Service

- ✅ O OS Service já é o **dono do ciclo de vida** da OS (máquina de estados desde a Fase 1); o orquestrador é a extensão natural dessa máquina
- ✅ Estado da saga **persistido e consultável** (`saga_os`): passo atual, histórico, compensações — o que o vídeo precisa mostrar
- ✅ Timeouts, retries e compensações num único lugar, testáveis como máquina de estados pura
- ✅ Participantes (Billing, Execução) ficam simples: recebem comandos, executam transação local, emitem evento
- ❌ Orquestrador como ponto de concentração — mitigado: é stateless em memória (estado no banco), escala com o OS Service, e mensagens são duráveis (SQS) — se cair, retoma
- ❌ Acoplamento do orquestrador aos contratos dos participantes — aceito e versionado no AsyncAPI

### Opção C — Orquestrador como serviço separado (ou motor: Temporal/Step Functions)

- ✅ Separação máxima; Step Functions é AWS-nativo
- ❌ Quarto serviço para manter; Step Functions com callbacks para SQS complica a demo local; Temporal exige cluster próprio
- ❌ Ganho pequeno para o tamanho do sistema

## Decisão

**Opção B — saga orquestrada**, com o **orquestrador dentro do OS Service**.
O orquestrador envia **comandos** (`execucao.enfileirar`, `billing.gerar-orcamento`,
`execucao.iniciar`, `billing.cancelar-orcamento`, `execucao.liberar-reservas`) e
avança ao receber **eventos** dos participantes. Estado em `saga_os`, exposto em
`GET /ordens-servico/:numero/saga`.

**Notificação é coreografada**: apenas assina fatos (`billing.orcamento-gerado`,
`os.finalizada`…) e não participa da saga — o sistema demonstra os dois estilos
onde cada um cabe.

Critério de recuperação (AWS Prescriptive Guidance): **falha de plataforma →
retry** (recuperação para frente, backoff + DLQ); **falha de negócio →
compensação** (recuperação para trás, ordem inversa).

## Consequências

- Novo status **`AGUARDANDO_PAGAMENTO`** na máquina de estados da OS ([ADR-0012](../adr/ADR-0012-pagamento-mercado-pago.md)).
- Toda ação compensatória é **idempotente** e reexecutável; registrada em `saga_os`.
- Matriz passo → falha → compensações mantida em [US-F4-11](../../user-stories/f4-11-compensacoes-rollback.md) e nos diagramas de sequência.
- Injeção de falhas controlada (flag em ambiente não produtivo + cartões de teste do Mercado Pago) para a demo.
- Métricas do orquestrador (`oficina_os_saga_passos_total`, duração por passo, sagas em compensação) alimentam o dashboard "Fluxo distribuído".
