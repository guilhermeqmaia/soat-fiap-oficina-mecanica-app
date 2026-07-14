import { Test, TestingModule } from '@nestjs/testing';
import {
  CLIENTE_REPOSITORY,
  ClienteRepository,
} from '../../../cliente/domain/cliente.repository';
import { PUBLIC_BASE_URL } from '../ports/public-base-url';
import { APPROVAL_LINK_TOKEN } from '../ports/approval-link-token';
import { Cliente } from '../../../cliente/domain/cliente.entity';
import { OrcamentoProntoEvent } from '../../../shared/domain/events/orcamento-pronto.event';
import { OsFinalizadaEvent } from '../../../shared/domain/events/os-finalizada.event';
import { OsStatusAlteradoEvent } from '../../../ordem-de-servico/domain/events/os-status-alterado.event';
import { StatusOS } from '../../../ordem-de-servico/domain/value-objects/status-os.vo';
import { CanalNotificacao } from '../../domain/value-objects/canal-notificacao.vo';
import { TipoNotificacao } from '../../domain/value-objects/tipo-notificacao.vo';
import { EnviarNotificacaoUseCase } from '../use-cases/enviar-notificacao.use-case';
import { OrdemDeServicoNotificacaoListener } from './ordem-de-servico.listener';

describe('OrdemDeServicoNotificacaoListener', () => {
  let listener: OrdemDeServicoNotificacaoListener;
  let enviarNotificacao: jest.Mocked<Pick<EnviarNotificacaoUseCase, 'execute'>>;
  let clienteRepository: jest.Mocked<Pick<ClienteRepository, 'findById'>>;

  const clienteComEmail = Cliente.reconstitute({
    id: 'cliente-1',
    nome: 'Joao da Silva',
    cpfCnpj: '52998224725',
    telefone: '11999998888',
    email: 'joao@email.com',
  });

  const clienteSemEmail = Cliente.reconstitute({
    id: 'cliente-2',
    nome: 'Maria sem email',
    cpfCnpj: '52998224725',
    telefone: '11999998888',
    email: null,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    enviarNotificacao = { execute: jest.fn().mockResolvedValue(undefined) };
    clienteRepository = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdemDeServicoNotificacaoListener,
        { provide: EnviarNotificacaoUseCase, useValue: enviarNotificacao },
        { provide: CLIENTE_REPOSITORY, useValue: clienteRepository },
        { provide: PUBLIC_BASE_URL, useValue: 'http://localhost:3000' },
        { provide: APPROVAL_LINK_TOKEN, useValue: 'email-token' },
      ],
    }).compile();

    listener = module.get(OrdemDeServicoNotificacaoListener);
  });

  describe('onOrcamentoPronto', () => {
    const event = new OrcamentoProntoEvent(
      'os-id-1',
      'OS-2026-001',
      'cliente-1',
      'Trocar pastilhas de freio',
      450.5,
    );

    it('envia notificacao com instrucao de aprovar/rejeitar quando cliente tem email', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteComEmail);

      await listener.onOrcamentoPronto(event);

      expect(enviarNotificacao.execute).toHaveBeenCalledTimes(1);
      const arg = enviarNotificacao.execute.mock.calls[0][0];
      expect(arg.tipo).toBe(TipoNotificacao.ORCAMENTO_PRONTO);
      expect(arg.canal).toBe(CanalNotificacao.EMAIL);
      expect(arg.destinatario).toBe('joao@email.com');
      expect(arg.ordemDeServicoId).toBe('os-id-1');
      expect(arg.mensagem).toContain('OS-2026-001');
      expect(arg.mensagem).toContain('Para aprovar, clique aqui');
      expect(arg.mensagem).toContain('Para rejeitar, clique aqui');
      expect(arg.mensagem).toContain(
        'http://localhost:3000/webhooks/ordens-servico/os-id-1/aprovar?token=email-token',
      );
    });

    it('inclui URLs absolutas assinadas para aprovar e rejeitar pelo email', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteComEmail);

      await listener.onOrcamentoPronto(event);

      const arg = enviarNotificacao.execute.mock.calls[0][0];
      expect(arg.mensagem).toContain(
        'http://localhost:3000/webhooks/ordens-servico/os-id-1/aprovar?token=email-token',
      );
      expect(arg.mensagem).toContain(
        'http://localhost:3000/webhooks/ordens-servico/os-id-1/rejeitar?token=email-token',
      );
    });

    it('nao envia notificacao quando cliente nao tem email', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteSemEmail);

      await listener.onOrcamentoPronto(event);

      expect(enviarNotificacao.execute).not.toHaveBeenCalled();
    });

    it('nao envia notificacao quando cliente nao existe', async () => {
      clienteRepository.findById.mockResolvedValueOnce(null);

      await listener.onOrcamentoPronto(event);

      expect(enviarNotificacao.execute).not.toHaveBeenCalled();
    });

    it('engole erros para nao bloquear fluxo principal', async () => {
      clienteRepository.findById.mockRejectedValueOnce(new Error('db down'));

      await expect(listener.onOrcamentoPronto(event)).resolves.toBeUndefined();
    });
  });

  describe('onOsFinalizada', () => {
    const event = new OsFinalizadaEvent(
      'os-id-2',
      'OS-2026-002',
      'cliente-1',
    );

    it('envia notificacao informando que veiculo esta pronto para retirada', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteComEmail);

      await listener.onOsFinalizada(event);

      expect(enviarNotificacao.execute).toHaveBeenCalledTimes(1);
      const arg = enviarNotificacao.execute.mock.calls[0][0];
      expect(arg.tipo).toBe(TipoNotificacao.OS_FINALIZADA);
      expect(arg.canal).toBe(CanalNotificacao.EMAIL);
      expect(arg.mensagem).toContain('pronto para retirada');
      expect(arg.mensagem).toContain('OS-2026-002');
      expect(arg.mensagem).toContain(
        'http://localhost:3000/ordens-servico/numero/OS-2026-002/status',
      );
    });

    it('nao envia notificacao quando cliente nao tem email', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteSemEmail);

      await listener.onOsFinalizada(event);

      expect(enviarNotificacao.execute).not.toHaveBeenCalled();
    });

    it('engole erros para nao bloquear fluxo principal', async () => {
      clienteRepository.findById.mockRejectedValueOnce(new Error('db down'));

      await expect(listener.onOsFinalizada(event)).resolves.toBeUndefined();
    });
  });

  describe('onOsStatusAlterado', () => {
    const event = new OsStatusAlteradoEvent(
      'os-id-3',
      'OS-2026-003',
      'cliente-1',
      StatusOS.AGUARDANDO_APROVACAO,
      StatusOS.EM_EXECUCAO,
      new Date('2026-06-25T10:00:00.000Z'),
    );

    it('envia notificacao com status anterior, status atual e timestamp', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteComEmail);

      await listener.onOsStatusAlterado(event);

      expect(enviarNotificacao.execute).toHaveBeenCalledTimes(1);
      expect(enviarNotificacao.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: 'cliente-1',
          ordemDeServicoId: 'os-id-3',
          tipo: TipoNotificacao.STATUS_OS_ALTERADO,
          canal: CanalNotificacao.EMAIL,
          destinatario: 'joao@email.com',
          statusAnterior: StatusOS.AGUARDANDO_APROVACAO,
          statusAtual: StatusOS.EM_EXECUCAO,
          timestamp: new Date('2026-06-25T10:00:00.000Z'),
        }),
      );
    });

    it.each([StatusOS.AGUARDANDO_APROVACAO, StatusOS.FINALIZADA])(
      'nao envia notificacao generica quando o status %s ja possui notificacao dedicada',
      async (statusAtual) => {
        const eventoDedicado = new OsStatusAlteradoEvent(
          'os-id-4',
          'OS-2026-004',
          'cliente-1',
          StatusOS.EM_EXECUCAO,
          statusAtual,
          new Date('2026-06-25T10:00:00.000Z'),
        );

        await listener.onOsStatusAlterado(eventoDedicado);

        expect(enviarNotificacao.execute).not.toHaveBeenCalled();
        expect(clienteRepository.findById).not.toHaveBeenCalled();
      },
    );

    it('usa clienteId como destinatario quando cliente nao tem email', async () => {
      clienteRepository.findById.mockResolvedValueOnce(clienteSemEmail);

      await listener.onOsStatusAlterado(event);

      const arg = enviarNotificacao.execute.mock.calls[0][0];
      expect(arg.destinatario).toBe('cliente-1');
    });

    it('engole erros para nao bloquear fluxo principal', async () => {
      clienteRepository.findById.mockRejectedValueOnce(new Error('db down'));

      await expect(listener.onOsStatusAlterado(event)).resolves.toBeUndefined();
    });
  });
});
