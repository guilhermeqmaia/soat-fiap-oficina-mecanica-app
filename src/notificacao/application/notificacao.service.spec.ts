import { Test, TestingModule } from '@nestjs/testing';
import { Notificacao } from '../domain/notificacao.entity';
import {
  NOTIFICACAO_REPOSITORY,
  NotificacaoRepository,
} from '../domain/notificacao.repository';
import { CanalNotificacao } from '../domain/value-objects/canal-notificacao.vo';
import { StatusNotificacao } from '../domain/value-objects/status-notificacao.vo';
import { TipoNotificacao } from '../domain/value-objects/tipo-notificacao.vo';
import { NOTIFICADOR, Notificador } from './ports/notificador.port';
import { NotificacaoService } from './notificacao.service';

describe('NotificacaoService', () => {
  let service: NotificacaoService;
  let repository: jest.Mocked<NotificacaoRepository>;
  let emailNotificador: jest.Mocked<Notificador>;

  const input = {
    clienteId: 'cliente-1',
    ordemDeServicoId: 'os-1',
    tipo: TipoNotificacao.ORCAMENTO_PRONTO,
    canal: CanalNotificacao.EMAIL,
    destinatario: 'cliente@email.com',
    assunto: 'Orcamento pronto',
    mensagem: 'Mensagem',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    repository = {
      create: jest.fn().mockImplementation(async (n: Notificacao) => n),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    emailNotificador = {
      canal: CanalNotificacao.EMAIL,
      enviar: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacaoService,
        { provide: NOTIFICACAO_REPOSITORY, useValue: repository },
        { provide: NOTIFICADOR, useValue: [emailNotificador] },
      ],
    }).compile();

    service = module.get(NotificacaoService);
  });

  describe('construtor', () => {
    it('lanca erro quando dois notificadores compartilham o mesmo canal', async () => {
      const dupA: Notificador = {
        canal: CanalNotificacao.EMAIL,
        enviar: jest.fn(),
      };
      const dupB: Notificador = {
        canal: CanalNotificacao.EMAIL,
        enviar: jest.fn(),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            NotificacaoService,
            { provide: NOTIFICACAO_REPOSITORY, useValue: repository },
            { provide: NOTIFICADOR, useValue: [dupA, dupB] },
          ],
        }).compile(),
      ).rejects.toThrow(/duplicados/);
    });
  });

  describe('enviar', () => {
    it('envia pelo notificador correto e persiste com status ENVIADA', async () => {
      const result = await service.enviar(input);

      expect(emailNotificador.enviar).toHaveBeenCalledWith({
        destinatario: input.destinatario,
        assunto: input.assunto,
        corpo: input.mensagem,
      });
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(StatusNotificacao.ENVIADA);
      expect(result.enviadaEm).not.toBeNull();
    });

    it('persiste com status FALHOU quando o notificador lanca erro', async () => {
      emailNotificador.enviar.mockRejectedValueOnce(new Error('SMTP down'));

      const result = await service.enviar(input);

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(StatusNotificacao.FALHOU);
      expect(result.erro).toBe('SMTP down');
      expect(result.enviadaEm).toBeNull();
    });

    it('nao propaga erro do notificador (nao bloqueia fluxo principal)', async () => {
      emailNotificador.enviar.mockRejectedValueOnce(new Error('boom'));

      await expect(service.enviar(input)).resolves.toBeDefined();
    });

    it('persiste como FALHOU quando nao ha notificador para o canal', async () => {
      const moduleSemNotificador: TestingModule =
        await Test.createTestingModule({
          providers: [
            NotificacaoService,
            { provide: NOTIFICACAO_REPOSITORY, useValue: repository },
            { provide: NOTIFICADOR, useValue: [] },
          ],
        }).compile();
      const svc = moduleSemNotificador.get(NotificacaoService);

      const result = await svc.enviar(input);

      expect(emailNotificador.enviar).not.toHaveBeenCalled();
      expect(result.status).toBe(StatusNotificacao.FALHOU);
      expect(result.erro).toContain('Nenhum notificador');
    });
  });

  describe('findAll', () => {
    it('delega ao repository', async () => {
      repository.findAll.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(repository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result.total).toBe(0);
    });
  });
});
