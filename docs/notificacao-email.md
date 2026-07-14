# Notificação por e-mail (Brevo/SMTP) — US-20

A oficina notifica o cliente **no e-mail cadastrado** nas transições da OS
(orçamento pronto, OS finalizada, mudança de status). O envio é um **adapter
plugável** na porta `Notificador` (canal `EMAIL`), selecionado por env.

Provider padrão do projeto: **`email` via Brevo** (SMTP, free tier).

| `NOTIFICATION_PROVIDER` | Efeito |
|---|---|
| `email` / `smtp` (**default**) | Envia e-mail de verdade via SMTP (nodemailer/Brevo). |
| `mock` | Só loga o envio (dev/demo sem dependências). |
| `webhook` | POST assinado com HMAC-SHA256 para uma URL externa. |

## Arquitetura (Clean / Hexagonal)

- **Application** só conhece a porta `Notificador`
  (`application/ports/notificador.port.ts`) e a interface `MensagemNotificacao`.
  O listener (`OrdemDeServicoNotificacaoListener`) e o
  `EnviarNotificacaoUseCase` não sabem que existe SMTP/Brevo.
- **Infrastructure** implementa a porta:
  `infrastructure/smtp-email-notificador.adapter.ts` fala nodemailer e lê as
  variáveis via `ConfigService`. Trocar Brevo por outro provedor é só env — nada
  na aplicação/domínio muda.
- **Composição**: `notificacao.module.ts` escolhe o adapter por
  `NOTIFICATION_PROVIDER`. A notificação é **persistida** com status `ENVIADA`
  ou `FALHA` independentemente do envio (visível no admin e no portal).

## Comportamento sem credenciais (funciona já, real depois)

Enquanto `SMTP_USER`/`SMTP_PASS` estiverem **vazios**, o adapter cria uma **conta
de teste Ethereal** em runtime (zero cadastro) e loga um link de preview:

```
[SmtpEmailNotificador] [EMAIL] enviado to=cl*****@email.com ... preview=https://ethereal.email/message/XXXX
```

Abra o `preview=` no navegador para ver o e-mail. Assim que você preencher as
credenciais do Brevo, os e-mails passam a sair de verdade — sem mudar código.

## Setup do Brevo (fazer depois)

1. Crie a conta em <https://www.brevo.com> (free tier: ~300 e-mails/dia).
2. **Verifique um remetente** (Senders & IP → adicione/valide o e-mail que vai no
   `EMAIL_FROM`). O Brevo recusa enviar de remetentes não verificados.
3. Pegue as credenciais em **Transactional → SMTP**:
   - `SMTP_USER` = e-mail de login da conta Brevo.
   - `SMTP_PASS` = a **SMTP key** gerada ali (não é a senha do site).
4. Preencha `SMTP_USER`, `SMTP_PASS` e `EMAIL_FROM`:
   - **Local**: no `.env` (já vem com `NOTIFICATION_PROVIDER=email` e o host do Brevo).
   - **Kubernetes**: em `k8s/configmap.yaml` (as chaves já existem). Depois:
     ```bash
     kubectl apply -k k8s/
     kubectl rollout restart deployment/oficina-app -n oficina
     ```

> As credenciais podem ficar no ConfigMap (free tier, sem risco relevante). Se
> preferir mantê-las secretas, mova `SMTP_PASS` para o Secret `oficina-app`
> (ver `k8s/secret.yaml.example`) — o `envFrom` faz o Secret prevalecer.

## Variáveis

| Var | Default | Descrição |
|---|---|---|
| `NOTIFICATION_PROVIDER` | `email` | `email` \| `mock` \| `webhook`. |
| `SMTP_HOST` | `smtp-relay.brevo.com` | Host SMTP. Vazio ⇒ Ethereal. |
| `SMTP_PORT` | `587` | Porta SMTP. |
| `SMTP_SECURE` | `false` | `true` só na porta 465. |
| `SMTP_USER` | — | Login SMTP (Brevo). Vazio ⇒ Ethereal. |
| `SMTP_PASS` | — | SMTP key (Brevo). |
| `EMAIL_FROM` | `Oficina Mecanica <...>` | Remetente (verificado no Brevo). |

## Como testar

Dispare uma transição que notifica o cliente (o cliente da OS precisa ter e-mail;
as seeds de demo já têm):

- **Orçamento pronto** (US-12) → `ORCAMENTO_PRONTO`.
- **OS finalizada** (US-15) → `OS_FINALIZADA`.
- **Outras transições** → `STATUS_OS_ALTERADO`.

Confira: o log da app (`preview=` no modo Ethereal, ou `messageId` no Brevo) **e**
o histórico de notificações no admin (`/notificacoes`) e no portal do cliente.

## Testes automatizados

`src/notificacao/infrastructure/smtp-email-notificador.adapter.spec.ts` cobre:
envio via SMTP real, `secure` derivado da porta 465, reuso do transporte,
fallback Ethereal (sem host **e** sem credenciais), escape de HTML e propagação
de erro.

```bash
npm run test:unit -- smtp-email-notificador
```
