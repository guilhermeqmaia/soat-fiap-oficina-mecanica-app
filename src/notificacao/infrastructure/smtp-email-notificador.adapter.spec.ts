jest.mock('nodemailer');

import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailNotificador } from './smtp-email-notificador.adapter';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';

const sendMail = jest.fn();
const createTransport = nodemailer.createTransport as unknown as jest.Mock;
const createTestAccount = nodemailer.createTestAccount as unknown as jest.Mock;
const getTestMessageUrl = nodemailer.getTestMessageUrl as unknown as jest.Mock;

/** ConfigService falso: devolve o valor do mapa ou o default recebido. */
function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, def?: string) => values[key] ?? def ?? '',
  } as unknown as ConfigService;
}

/** Credenciais SMTP reais (Brevo-like) para exercitar o caminho de envio real. */
const brevo = {
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'user@oficina.com',
  SMTP_PASS: 'segredo',
  EMAIL_FROM: 'Oficina <no-reply@oficina.com>',
};

const mensagem = {
  destinatario: 'cliente@email.com',
  assunto: 'Orcamento da OS 123 pronto',
  corpo: 'Ola Maria,\nSeu orcamento esta pronto.',
};

describe('SmtpEmailNotificador', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({ messageId: 'msg-1' });
    createTransport.mockReturnValue({ sendMail });
    createTestAccount.mockResolvedValue({
      user: 'eth-user',
      pass: 'eth-pass',
      smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
    });
    getTestMessageUrl.mockReturnValue(false);
  });

  it('opera no canal EMAIL', () => {
    const adapter = new SmtpEmailNotificador(makeConfig(brevo));
    expect(adapter.canal).toBe(CanalNotificacao.EMAIL);
  });

  it('envia via SMTP real com from/to/subject/text corretos', async () => {
    const adapter = new SmtpEmailNotificador(makeConfig(brevo));

    await adapter.enviar(mensagem);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user: 'user@oficina.com', pass: 'segredo' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Oficina <no-reply@oficina.com>',
        to: 'cliente@email.com',
        subject: 'Orcamento da OS 123 pronto',
        text: 'Ola Maria,\nSeu orcamento esta pronto.',
        html: expect.stringContaining('Ola Maria,'),
      }),
    );
    expect(createTestAccount).not.toHaveBeenCalled();
  });

  it('deriva secure=true quando a porta e 465', async () => {
    const adapter = new SmtpEmailNotificador(
      makeConfig({ ...brevo, SMTP_PORT: '465' }),
    );
    await adapter.enviar(mensagem);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it('reutiliza o transporter entre envios (cria uma unica vez)', async () => {
    const adapter = new SmtpEmailNotificador(makeConfig(brevo));
    await adapter.enviar(mensagem);
    await adapter.enviar(mensagem);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('sem SMTP_HOST cai numa conta de teste Ethereal', async () => {
    getTestMessageUrl.mockReturnValue('https://ethereal.email/message/abc');

    const adapter = new SmtpEmailNotificador(makeConfig({}));
    await adapter.enviar(mensagem);

    expect(createTestAccount).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.ethereal.email',
        auth: { user: 'eth-user', pass: 'eth-pass' },
      }),
    );
  });

  it('com host mas SEM credenciais (Brevo antes do setup) cai no Ethereal', async () => {
    const adapter = new SmtpEmailNotificador(
      makeConfig({ SMTP_HOST: 'smtp-relay.brevo.com', SMTP_PORT: '587' }),
    );
    await adapter.enviar(mensagem);

    expect(createTestAccount).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.ethereal.email' }),
    );
  });

  it('escapa HTML do corpo (evita injecao no template)', async () => {
    const adapter = new SmtpEmailNotificador(makeConfig(brevo));
    await adapter.enviar({ ...mensagem, corpo: '<script>alert(1)</script>' });

    const enviado = sendMail.mock.calls[0][0] as { html: string };
    expect(enviado.html).toContain('&lt;script&gt;');
    expect(enviado.html).not.toContain('<script>');
  });

  it('propaga erro do envio para o use case marcar como falha', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const adapter = new SmtpEmailNotificador(makeConfig(brevo));
    await expect(adapter.enviar(mensagem)).rejects.toThrow('SMTP down');
  });
});
