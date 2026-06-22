import { EnviarNotificacaoUseCase } from './enviar-notificacao.use-case';
import { CanalNotificacao } from '../../domain/value-objects/canal-notificacao.vo';
import { StatusNotificacao } from '../../domain/value-objects/status-notificacao.vo';
import { TipoNotificacao } from '../../domain/value-objects/tipo-notificacao.vo';

const input = {
  clienteId: 'cliente-1',
  ordemDeServicoId: 'os-1',
  tipo: TipoNotificacao.ORCAMENTO_PRONTO,
  canal: CanalNotificacao.EMAIL,
  destinatario: 'cliente@email.com',
  assunto: 'Orcamento pronto',
  mensagem: 'Mensagem do orcamento',
};

describe('EnviarNotificacaoUseCase', () => {
  let gateway: any;
  let emailNotificador: any;
  let useCase: EnviarNotificacaoUseCase;

  beforeEach(() => {
    gateway = {
      create: jest.fn().mockImplementation(async (n) => n),
    };
    emailNotificador = {
      canal: CanalNotificacao.EMAIL,
      enviar: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new EnviarNotificacaoUseCase(gateway, [emailNotificador]);
  });

  describe('construtor', () => {
    it('lanca erro quando dois notificadores compartilham o mesmo canal', () => {
      const dupA = { canal: CanalNotificacao.EMAIL, enviar: jest.fn() };
      const dupB = { canal: CanalNotificacao.EMAIL, enviar: jest.fn() };

      expect(() => new EnviarNotificacaoUseCase(gateway, [dupA, dupB])).toThrow(
        /duplicados/,
      );
    });
  });

  describe('execute', () => {
    it('envia pelo notificador correto e persiste com status ENVIADA', async () => {
      const result = await useCase.execute(input);

      expect(emailNotificador.enviar).toHaveBeenCalledWith({
        destinatario: input.destinatario,
        assunto: input.assunto,
        corpo: input.mensagem,
      });
      expect(gateway.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(StatusNotificacao.ENVIADA);
      expect(result.enviadaEm).not.toBeNull();
    });

    it('persiste com status FALHOU quando o notificador lanca erro', async () => {
      emailNotificador.enviar.mockRejectedValueOnce(new Error('SMTP down'));

      const result = await useCase.execute(input);

      expect(gateway.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(StatusNotificacao.FALHOU);
      expect(result.erro).toBe('SMTP down');
      expect(result.enviadaEm).toBeNull();
    });

    it('nao propaga erro do notificador (nao bloqueia fluxo principal)', async () => {
      emailNotificador.enviar.mockRejectedValueOnce(new Error('boom'));

      await expect(useCase.execute(input)).resolves.toBeDefined();
    });

    it('persiste como FALHOU quando nao ha notificador para o canal', async () => {
      const useCaseSemNotificador = new EnviarNotificacaoUseCase(gateway, []);

      const result = await useCaseSemNotificador.execute(input);

      expect(emailNotificador.enviar).not.toHaveBeenCalled();
      expect(result.status).toBe(StatusNotificacao.FALHOU);
      expect(result.erro).toContain('Nenhum notificador');
    });
  });
});
