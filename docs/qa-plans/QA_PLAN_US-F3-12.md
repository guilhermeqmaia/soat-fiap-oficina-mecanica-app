# QA Plan — US-F3-12: Entrega — Video, PDF e Compartilhamento

## Summary
Valida o pacote final de entrega da Fase 3: video demonstrativo (ate 15 min, cobrindo os 6 pontos exigidos), PDF unico com todos os links e confirmacoes, e os acessos (usuario `soat-architecture` nos 4 repos, branches protegidas). Este QA Plan e essencialmente uma checklist de conferencia pre-submissao — a maior parte dos cenarios e manual, ligados aos itens ja implementados nas outras stories.

## Prerequisites
- Todas as outras stories da Fase 3 concluidas ou em estado demonstravel ([QA_PLAN_US-F3-01](QA_PLAN_US-F3-01.md) a [QA_PLAN_US-F3-11](QA_PLAN_US-F3-11.md))
- Conta no YouTube/Vimeo para publicar o video
- Acesso de admin aos 4 repositorios para conferir colaboradores e protecao de branch

## Test Scenarios

### TS-01: Video cobre autenticacao com CPF
- **Type:** Manual (revisao do roteiro/gravacao)
- **Steps:**
  1. Assistir o video e cronometrar o trecho de autenticacao
  2. Confirmar que mostra o fluxo cliente -> API Gateway -> Lambda -> JWT (chamada real, nao so slide)
- **Expected result:** Fluxo demonstrado com uma chamada real e o token resultante visivel

### TS-02: Video cobre pipeline de CI/CD em execucao
- **Type:** Manual
- **Steps:**
  1. Confirmar trecho mostrando um pipeline (Actions) rodando ao vivo ou uma execucao recente completa
- **Expected result:** CI/CD demonstrado, nao apenas descrito

### TS-03: Video cobre deploy automatizado
- **Type:** Manual
- **Steps:**
  1. Confirmar trecho mostrando o deploy (CD) para a nuvem, ou evidencia de uma execucao recente
- **Expected result:** Deploy automatizado demonstrado

### TS-04: Video cobre consumo das APIs protegidas
- **Type:** Manual
- **Steps:**
  1. Confirmar chamada a uma rota protegida usando o token do gateway (nao um token gerado localmente)
- **Expected result:** Chamada bem-sucedida com o token real do fluxo de CPF

### TS-05: Video cobre dashboard com analise ao vivo
- **Type:** Manual
- **Acceptance criterion:** Depende de [QA_PLAN_US-F3-11](QA_PLAN_US-F3-11.md) TS-13
- **Steps:**
  1. Confirmar trecho no dashboard real (Datadog) navegando pelos paineis com dados atuais
- **Expected result:** Dashboard ao vivo, nao print estatico

### TS-06: Video cobre logs e traces em execucao
- **Type:** Manual
- **Steps:**
  1. Confirmar trecho mostrando logs estruturados e/ou trace de uma requisicao, com o correlationId visivel
- **Expected result:** Correlacao demonstrada na pratica

### TS-07: Video dentro do limite de 15 minutos
- **Type:** Manual
- **Steps:**
  1. Conferir a duracao total do video publicado
- **Expected result:** <= 15 minutos

### TS-08: Video publicado com visibilidade correta
- **Type:** Manual
- **Steps:**
  1. Abrir o link do video em uma janela anonima/sem login
- **Expected result:** Acessivel (publico ou nao listado, nunca privado)

### TS-09: PDF contem os links dos 4 repositorios
- **Type:** Manual
- **Steps:**
  1. Abrir o PDF final e clicar em cada um dos 4 links de repositorio
- **Expected result:** Todos os links resolvem para os repositorios corretos e acessiveis

### TS-10: PDF contem o link do video
- **Type:** Manual
- **Steps:**
  1. Clicar no link do video a partir do PDF
- **Expected result:** Abre o video correto, dentro do limite de 15 min

### TS-11: PDF contem os links de documentacao
- **Type:** Manual
- **Acceptance criterion:** Arquitetura, RFCs, ADRs, ER, Swagger/Postman
- **Steps:**
  1. Conferir cada link (diagramas, RFCs [f3-doc-01](../user-stories/f3-doc-01-rfcs.md), ADRs [f3-doc-02](../user-stories/f3-doc-02-adrs.md), ER [f3-doc-04](../user-stories/f3-doc-04-justificativa-banco-er.md), Swagger/Postman)
- **Expected result:** Todos os links funcionam e apontam para o conteudo certo

### TS-12: PDF confirma soat-architecture nos 4 repos
- **Type:** Manual
- **Steps:**
  1. Conferir a secao do PDF que afirma a adicao do usuario
  2. Cruzar com a checagem real em cada repositorio (Settings > Collaborators)
- **Expected result:** Declaracao do PDF bate com a realidade nos 4 repos

### TS-13: Usuario soat-architecture efetivamente colaborador nos 4 repos
- **Type:** Manual — mesmo cenario de [QA_PLAN_US-F3-07](QA_PLAN_US-F3-07.md) TS-07
- **Steps:**
  1. Verificar em cada um dos 4 repositorios
- **Expected result:** Presente nos 4

### TS-14: main/master protegida em todos (evidencia no PDF/README)
- **Type:** Manual — mesmo cenario de [QA_PLAN_US-F3-07](QA_PLAN_US-F3-07.md) TS-02
- **Steps:**
  1. Confirmar que o PDF ou os READMEs trazem evidencia (print/descricao) da protecao de branch
- **Expected result:** Evidencia presente e condizente com a configuracao real

### TS-15: Links de deploy ativo validados
- **Type:** Manual
- **Steps:**
  1. Acessar cada link de ambiente ativo citado na documentacao (gateway, dashboards) pouco antes da submissao
- **Expected result:** Links funcionando no momento da entrega (nao apenas historicamente)

### TS-16: Bloco TODO do video substituido no README principal
- **Type:** Manual
- **Steps:**
  1. Abrir o README principal e localizar a secao de video (ver [f3-doc-06](../user-stories/f3-doc-06-indice-docs-readme.md))
- **Expected result:** Link final presente, sem bloco `TODO` remanescente

## Edge Cases
- Link do video ou de um repositorio ficando privado/removido entre a gravacao do PDF e a correcao — validar tudo de novo pouco antes do envio
- PDF gerado a partir de um markdown com links relativos que nao funcionam fora do repositorio — usar sempre URLs absolutas no PDF final
- Video ultrapassando 15 min por poucos segundos — cortar antes de publicar, nao arriscar desclassificacao

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Video: autenticacao com CPF | TS-01 |
| Video: pipeline CI/CD | TS-02 |
| Video: deploy automatizado | TS-03 |
| Video: consumo de APIs protegidas | TS-04 |
| Video: dashboard ao vivo | TS-05 |
| Video: logs e traces | TS-06 |
| Video: ate 15 min | TS-07 |
| Video: publico/nao listado | TS-08 |
| PDF: links dos 4 repos | TS-09 |
| PDF: link do video | TS-10 |
| PDF: links de documentacao | TS-11 |
| PDF: confirmacao soat-architecture | TS-12 |
| soat-architecture nos 4 repos | TS-13 |
| Branch protegida (evidencia) | TS-14 |
| Links de deploy ativo validados | TS-15 |
| Bloco TODO do video substituido | TS-16 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Checklist executada na integra pouco antes da submissao no Portal do Aluno
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Nao ha comando automatizado — esta story e validada manualmente,
# como checklist final de conferencia antes da entrega.
```
