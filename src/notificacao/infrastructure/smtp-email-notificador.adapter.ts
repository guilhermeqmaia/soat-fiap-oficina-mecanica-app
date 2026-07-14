import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';
import {
  MensagemNotificacao,
  Notificador,
} from '../application/ports/notificador.port';
import { maskEmail } from './utils/mask-email';

/**
 * Adapter de e-mail REAL via SMTP (nodemailer), plugado na porta `Notificador`
 * no canal EMAIL. E provider-agnostico: funciona com qualquer SMTP de plano
 * gratuito (Brevo, Gmail com App Password, Mailtrap, ...).
 *
 * Sem `SMTP_HOST` configurado, cai numa conta de teste Ethereal criada em
 * runtime (zero cadastro) e loga a URL de preview de cada e-mail — ideal para
 * a demo/gravacao, sem precisar de credenciais reais nem enviar para caixas
 * de verdade.
 *
 * Ativacao: `NOTIFICATION_PROVIDER=email` (ver notificacao.module.ts).
 */
@Injectable()
export class SmtpEmailNotificador implements Notificador {
  readonly canal = CanalNotificacao.EMAIL;
  private readonly logger = new Logger(SmtpEmailNotificador.name);

  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user: string;
  private readonly pass: string;
  private readonly from: string;

  // Transporter criado sob demanda e cacheado: a conta Ethereal exige uma
  // chamada assincrona, entao nao da para montar no construtor.
  private transporterPromise?: Promise<Transporter>;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('SMTP_HOST', '').trim();
    this.port = this.parsePort(this.config.get<string>('SMTP_PORT'));
    this.secure = this.parseBool(
      this.config.get<string>('SMTP_SECURE'),
      this.port === 465,
    );
    this.user = this.config.get<string>('SMTP_USER', '').trim();
    this.pass = this.config.get<string>('SMTP_PASS', '');
    this.from = this.config
      .get<string>('EMAIL_FROM', 'Oficina Mecanica <nao-responda@oficina.local>')
      .trim();
  }

  async enviar(mensagem: MensagemNotificacao): Promise<void> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: this.from,
      to: mensagem.destinatario,
      subject: mensagem.assunto,
      text: mensagem.corpo,
      html: this.toHtml(mensagem.corpo),
    });

    // Ethereal devolve uma URL de preview; SMTP real devolve `false`.
    const preview = nodemailer.getTestMessageUrl(info);
    this.logger.log(
      `[EMAIL] enviado to=${maskEmail(mensagem.destinatario)} ` +
        `subject="${mensagem.assunto}" messageId=${info.messageId}` +
        (preview ? ` preview=${preview}` : ''),
    );
  }

  private getTransporter(): Promise<Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = this.createTransporter().catch((err) => {
        // Nao cacheia a falha: permite nova tentativa no proximo envio.
        this.transporterPromise = undefined;
        throw err;
      });
    }
    return this.transporterPromise;
  }

  private async createTransporter(): Promise<Transporter> {
    const hostConfigurado = this.host && this.host.toLowerCase() !== 'ethereal';

    // Cai no Ethereal quando nao ha host, ou quando ha host mas ainda sem
    // credenciais. Relays reais (Brevo, Gmail, ...) SEMPRE exigem auth; sem
    // SMTP_USER nao da para enviar de verdade, entao usamos uma conta de teste
    // (com link de preview) ate as credenciais serem preenchidas — o fluxo
    // continua funcionando sem quebrar a demo.
    if (!hostConfigurado || !this.user) {
      const motivo = !hostConfigurado
        ? 'SMTP_HOST nao configurado'
        : `SMTP_HOST=${this.host} configurado, mas SMTP_USER vazio`;
      const testAccount = await nodemailer.createTestAccount();
      this.logger.warn(
        `${motivo}; usando conta de teste Ethereal (user=${testAccount.user}). ` +
          `Os e-mails NAO chegam a caixas reais — abra o link "preview=" logado ` +
          `em cada envio. Preencha SMTP_USER/SMTP_PASS para enviar via ` +
          `${hostConfigurado ? this.host : 'seu provedor SMTP'}.`,
      );
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }

    this.logger.log(
      `Transporte SMTP configurado host=${this.host} port=${this.port} ` +
        `secure=${this.secure} user=${this.user}`,
    );
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: { user: this.user, pass: this.pass },
    });
  }

  /** Converte o corpo texto em HTML simples, preservando quebras de linha. */
  private toHtml(corpo: string): string {
    const escaped = corpo
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return (
      `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; ` +
      `line-height: 1.5; color: #222; white-space: pre-wrap;">${escaped}</div>`
    );
  }

  private parsePort(value?: string): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 587;
  }

  private parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value.trim() === '') {
      return fallback;
    }
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
  }
}
