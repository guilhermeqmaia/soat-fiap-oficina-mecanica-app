# US-F3-DOC-05: READMEs por Repositorio

**User Story:** Como Avaliador/Novo desenvolvedor, quero um README completo em cada um dos 4 repositorios, para entender o proposito e conseguir rodar/deployar cada parte sem reverse-engineer.

**Prioridade:** Alta
**Story Points:** 3
**Status:** To Do
**DDD Domain:** Documentacao
**DDD Layer:** —
**Repositorio:** todos

## Contexto

O enunciado exige, em **cada repositorio**, um README com: descricao clara do
proposito, tecnologias utilizadas, passos para execucao e deploy, diagrama da
arquitetura especifica daquele repo e link para o Swagger/Postman.

## Criterios de Aceite

Cada um dos 4 repos ([f3-07](f3-07-segregacao-repositorios.md)) com README contendo:

- [ ] **Descricao clara do proposito** do repo
- [ ] **Tecnologias utilizadas**
- [ ] **Passos para execucao e deploy** (local + nuvem)
- [ ] **Diagrama da arquitetura especifica** daquele repo (Mermaid/imagem)
- [ ] **Link para o Swagger/Postman** das APIs (quando aplicavel)
- [ ] **Link do deploy ativo** (quando aplicavel)
- [ ] Dockerfile documentado (quando aplicavel)
- [ ] Badges de CI/coverage no topo

Por repo:

- [ ] `soat-fiap-oficina-auth-lambda`: contrato de entrada/saida da funcao (CPF -> JWT), variaveis, como testar/deployar
- [ ] `soat-fiap-oficina-infra-k8s`: recursos EKS criados, variaveis, como aplicar/destruir, diagrama de rede
- [ ] `soat-fiap-oficina-infra-db`: recursos RDS criados, secrets, como aplicar/destruir, contrato de `DATABASE_URL`
- [ ] `soat-fiap-oficina-mecanica-app`: execucao local, deploy no EKS, link Swagger, dependencia dos outros repos

## Notas

- O README da aplicacao (este repo) e coberto tambem por [f3-doc-06](f3-doc-06-indice-docs-readme.md) (hub central + secao Fase 3).
