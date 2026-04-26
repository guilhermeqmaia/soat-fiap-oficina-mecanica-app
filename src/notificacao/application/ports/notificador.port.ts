import { CanalNotificacao } from '../../domain/value-objects/canal-notificacao.vo';

export interface MensagemNotificacao {
  destinatario: string;
  assunto: string;
  corpo: string;
}

export interface Notificador {
  readonly canal: CanalNotificacao;
  enviar(mensagem: MensagemNotificacao): Promise<void>;
}

export const NOTIFICADOR = Symbol('Notificador');
