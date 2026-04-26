import { Injectable, Logger } from '@nestjs/common';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';
import {
  MensagemNotificacao,
  Notificador,
} from '../application/ports/notificador.port';
import { maskEmail } from './utils/mask-email';

@Injectable()
export class MockEmailNotificador implements Notificador {
  readonly canal = CanalNotificacao.EMAIL;
  private readonly logger = new Logger(MockEmailNotificador.name);

  async enviar(mensagem: MensagemNotificacao): Promise<void> {
    this.logger.log(
      `[MOCK EMAIL] to=${maskEmail(mensagem.destinatario)} subject="${mensagem.assunto}" bodyLength=${mensagem.corpo.length}`,
    );
  }
}
