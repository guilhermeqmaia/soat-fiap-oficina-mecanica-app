# US-F2-10: Refatoracao para Clean Architecture (Use Cases + Gateways + Presenters)

**User Story:** Como Avaliador/Arquiteto, quero que o codigo siga a Clean Architecture a risca (entidades, use cases isolados, gateways e presenters), para que a solucao atenda ao criterio de arquitetura limpa exigido na Fase 2 e fique testavel e desacoplada do framework.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Transversal (todos os bounded contexts)
**DDD Layer:** Application + Interface (Infrastructure como detalhe)

## Contexto

Avaliacao do estado atual (~65-70% de aderencia a Clean Architecture):

**Ja existe e esta correto:**
- Camadas `domain` / `application` / `infrastructure` separadas em todos os modulos
- Ports de repositorio no dominio implementados por adapters Prisma (ex: `cliente.repository.ts` -> `prisma-cliente.repository.ts`)
- Entidades de dominio puras (sem decorators de framework/Prisma)
- Inversao de dependencia via tokens NestJS (`@Inject(CLIENTE_REPOSITORY)`)
- Port de gateway externo `Notificador` (`notificacao/application/ports/notificador.port.ts`)

**Gaps para a Clean Architecture estrita (foco desta US):**
1. Nao ha Use Cases explicitos — logica concentrada em fat services (ex: `ordem-de-servico.service.ts`, ~445 linhas, 21 metodos)
2. Nao ha camada Gateway nomeada (Controller -> Use Case -> Gateway -> Repository/Prisma); hoje os ports de repositorio fazem esse papel mas sem o naming/estrutura que a banca espera
3. Sem Presenters — formatacao de resposta esta como `toResponse()` inline nos controllers
4. Sem objetos de Input/Output por use case — DTOs HTTP vazam para a camada de aplicacao
5. Domain events acoplados ao `EventEmitter2` do NestJS
6. Traducao de excecao dominio->HTTP espalhada nos controllers (sem exception filter global)

## Objetivo

Refatorar o codigo para o fluxo Clean Architecture estrito, sem alterar o comportamento externo das APIs (mesmos contratos REST). Comecar por 1 modulo de referencia (OrdemDeServico) e replicar o padrao.

Fluxo alvo:

```
Controller (interface)
  -> Use Case (application, 1 responsabilidade)
    -> Gateway (interface/port)
      -> Repository Adapter (infra/Prisma) | Notificador | servico externo
  -> Presenter (formata saida) -> DTO de resposta
```

## Criterios de Aceite

### Estrutura e padrao
- [x] Definir e documentar o padrao alvo em `docs/arquitetura/clean-architecture.md` (camadas, papel de cada artefato, regra de dependencia, exemplo de fluxo de uma request)
- [x] Introduzir camada **Gateway** explicita: interfaces de gateway na aplicacao + adapters na infraestrutura (os repositorios Prisma passam a implementar gateways)
- [x] Extrair **Use Cases** isolados (uma classe por caso de uso) a partir dos fat services, comecando por OrdemDeServico (`CriarOrdemDeServicoUseCase`, `AtribuirMecanicoUseCase`, `AprovarOrcamentoUseCase`, `AdicionarServicoUseCase`, etc. — 20 use cases)
- [x] Introduzir **Presenters** para a formatacao de saida (remover `toResponse()` inline dos controllers)
- [x] Definir objetos de **Input/Output** por use case (desacoplar DTO HTTP da aplicacao)

### Modulo de referencia + replicacao
- [x] OrdemDeServico totalmente migrado para o padrao (modulo de referencia)
- [x] Replicar o padrao para Cliente, Veiculo, Servico, Produto, Autenticacao e Notificacao
- [x] Fat services antigos removidos ou reduzidos a orquestracao fina (sem regra de negocio)

### Desacoplamento
- [x] Abstrair publicacao de domain events atras de uma interface (DomainEventPublisher) com adapter sobre o EventEmitter2 — application deixa de depender do framework de eventos
- [x] Exception filter/interceptor global traduz erros de dominio -> HTTP (remover try/catch repetido nos controllers)

### Qualidade
- [x] Regra de dependencia validada: domain nao importa application/infra; application nao importa Prisma/Nest HTTP; nenhuma violacao para dentro->fora (teste automatizado em `src/shared/architecture.spec.ts`)
- [x] Lint de fronteiras: teste de fronteiras em Jest (`architecture.spec.ts`) impede regressoes para dentro->fora
- [x] Testes existentes continuam passando; cobertura mantida (>=80%): 537 testes unitarios verdes, cobertura 93.6% linhas / 84% branches
- [x] Novos testes unitarios por use case (mockando gateways) demonstrando isolamento
- [x] Contratos REST preservados — 57 rotas inalteradas; suite e2e/integration completa verde (334/334) com Postgres via testcontainers. Excecao deliberada e aprovada: `GET /ordens-servico/:id` passou a retornar a view detalhada (cabecalho/corpo/rodape) para alinhar a expectativa do e2e pre-existente (a rota `:id/detalhes` permanece)
- [x] Diagrama da US-F2-08 atualizado para refletir Use Cases / Gateways / Presenters (diagramas Mermaid em `docs/arquitetura/clean-architecture.md`)

## Notas

- Refatoracao incremental por modulo para manter o app sempre verde; nao precisa ser um big-bang.
- Esta US conversa com a US-F2-08 (diagrama de arquitetura) — manter ambos alinhados.
