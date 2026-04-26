import { Notificacao } from './notificacao.entity';
import { CanalNotificacao } from './value-objects/canal-notificacao.vo';
import { StatusNotificacao } from './value-objects/status-notificacao.vo';
import { TipoNotificacao } from './value-objects/tipo-notificacao.vo';

describe('Notificacao', () => {
  const baseInput = {
    clienteId: 'cliente-1',
    ordemDeServicoId: 'os-1',
    tipo: TipoNotificacao.ORCAMENTO_PRONTO,
    canal: CanalNotificacao.EMAIL,
    destinatario: 'cliente@email.com',
    assunto: 'Orcamento pronto',
    mensagem: 'Mensagem do orcamento',
  };

  describe('create', () => {
    it('cria notificacao com status PENDENTE ate o envio ser tentado', () => {
      const n = Notificacao.create(baseInput);

      expect(n.clienteId).toBe('cliente-1');
      expect(n.ordemDeServicoId).toBe('os-1');
      expect(n.tipo).toBe(TipoNotificacao.ORCAMENTO_PRONTO);
      expect(n.canal).toBe(CanalNotificacao.EMAIL);
      expect(n.destinatario).toBe('cliente@email.com');
      expect(n.status).toBe(StatusNotificacao.PENDENTE);
      expect(n.erro).toBeNull();
      expect(n.enviadaEm).toBeNull();
    });

    it('aceita ordemDeServicoId opcional como null', () => {
      const n = Notificacao.create({ ...baseInput, ordemDeServicoId: undefined });
      expect(n.ordemDeServicoId).toBeNull();
    });
  });

  describe('marcarComoEnviada', () => {
    it('atualiza status para ENVIADA e seta enviadaEm', () => {
      const n = Notificacao.create(baseInput);
      const agora = new Date('2026-04-26T12:00:00Z');

      n.marcarComoEnviada(agora);

      expect(n.status).toBe(StatusNotificacao.ENVIADA);
      expect(n.enviadaEm).toEqual(agora);
      expect(n.erro).toBeNull();
    });

    it('limpa erro previo ao marcar como enviada', () => {
      const n = Notificacao.create(baseInput);
      n.marcarComoFalha('falha temporaria');

      n.marcarComoEnviada();

      expect(n.status).toBe(StatusNotificacao.ENVIADA);
      expect(n.erro).toBeNull();
      expect(n.enviadaEm).not.toBeNull();
    });
  });

  describe('marcarComoFalha', () => {
    it('atualiza status para FALHOU, registra erro e zera enviadaEm', () => {
      const n = Notificacao.create(baseInput);

      n.marcarComoFalha('SMTP indisponivel');

      expect(n.status).toBe(StatusNotificacao.FALHOU);
      expect(n.erro).toBe('SMTP indisponivel');
      expect(n.enviadaEm).toBeNull();
    });
  });

  describe('reconstitute', () => {
    it('restaura entidade a partir de dados persistidos', () => {
      const createdAt = new Date('2026-04-25T10:00:00Z');
      const enviadaEm = new Date('2026-04-25T10:00:01Z');

      const n = Notificacao.reconstitute({
        id: 'n-1',
        clienteId: 'cliente-1',
        ordemDeServicoId: 'os-1',
        tipo: TipoNotificacao.OS_FINALIZADA,
        canal: CanalNotificacao.EMAIL,
        destinatario: 'cliente@email.com',
        assunto: 'OS finalizada',
        mensagem: 'Sua OS foi finalizada',
        status: StatusNotificacao.ENVIADA,
        erro: null,
        enviadaEm,
        createdAt,
      });

      expect(n.id).toBe('n-1');
      expect(n.tipo).toBe(TipoNotificacao.OS_FINALIZADA);
      expect(n.status).toBe(StatusNotificacao.ENVIADA);
      expect(n.enviadaEm).toEqual(enviadaEm);
      expect(n.createdAt).toEqual(createdAt);
    });
  });
});
