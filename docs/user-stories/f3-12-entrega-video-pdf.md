# US-F3-12: Entrega — Video, PDF e Compartilhamento

**User Story:** Como time, quero preparar o pacote de entrega da Fase 3 (video, PDF e acessos), para submeter no Portal do Aluno atendendo a todos os requisitos formais.

**Prioridade:** Alta
**Story Points:** 2
**Status:** Em andamento
**DDD Domain:** Entrega
**DDD Layer:** —
**Repositorio:** todos

## Criterios de Aceite

Video demonstrativo (YouTube/Vimeo, publico ou nao listado, **ate 15 min**), demonstrando:

- [ ] **Autenticacao com CPF** (fluxo cliente -> API Gateway -> Lambda -> JWT)
- [ ] **Execucao da pipeline CI/CD**
- [ ] **Deploy automatizado** para a nuvem
- [ ] **Consumo das APIs protegidas** (com o token do gateway)
- [ ] **Dashboard de monitoramento com analise ao vivo**
- [ ] **Logs e traces em execucao** (correlacao)

PDF unico de entrega:

- [x] Links dos **4 repositorios**
- [ ] Link do **video** (ate 15 min)
- [x] Links das **documentacoes** (arquitetura, RFCs, ADRs, ER, Swagger/Postman)
- [ ] Confirmacao de que o usuario **`soat-architecture`** foi adicionado a **todos** os repos

Acessos:

- [x] Usuario **`soat-architecture`** adicionado como colaborador nos 4 repositorios — convites enviados nos 4; aceito no repo da app, pendentes de aceite nos demais (11/09)
- [x] `main`/`master` protegida em todos (evidencia no PDF/README) ([f3-07](f3-07-segregacao-repositorios.md))
- [ ] Links de deploy ativo validados (se aplicavel)

## Notas

- Ensaiar o roteiro do video para caber em 15 min (a demo ao vivo do dashboard e do fluxo de CPF sao os pontos de maior peso).
- Substituir o bloco TODO de video no README principal pelo link final.
