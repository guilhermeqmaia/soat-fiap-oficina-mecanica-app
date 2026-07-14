import { WebhookAprovacaoController } from './webhook-aprovacao.controller';
import { AprovarOrcamentoUseCase } from '../application/use-cases/aprovar-orcamento.use-case';
import { RejeitarOrcamentoUseCase } from '../application/use-cases/rejeitar-orcamento.use-case';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { ConfigService } from '@nestjs/config';

describe('WebhookAprovacaoController', () => {
  let controller: WebhookAprovacaoController;
  let aprovarUseCase: jest.Mocked<AprovarOrcamentoUseCase>;
  let rejeitarUseCase: jest.Mocked<RejeitarOrcamentoUseCase>;
  let configService: Pick<ConfigService, 'get'>;

  const makeOs = (status: StatusOS): OrdemDeServico => {
    const os = OrdemDeServico.create({
      clienteId: 'cliente-id',
      veiculoId: 'veiculo-id',
      descricaoInicial: 'Barulho ao frear',
    });
    // Force status for testing via reflection
    (os as any)._status = status;
    return os;
  };

  beforeEach(() => {
    aprovarUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AprovarOrcamentoUseCase>;

    rejeitarUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RejeitarOrcamentoUseCase>;

    configService = {
      get: jest.fn((key: string) =>
        key === 'WEBHOOK_APPROVAL_TOKEN' ? 'email-token' : undefined,
      ),
    };

    controller = new WebhookAprovacaoController(
      aprovarUseCase,
      rejeitarUseCase,
      configService as unknown as ConfigService,
    );
  });

  it('should call aprovarOrcamentoUseCase when aprovado=true', async () => {
    const os = makeOs(StatusOS.EM_EXECUCAO);
    aprovarUseCase.execute.mockResolvedValue(os);

    const result = await controller.aprovacao('os-id', {
      aprovado: true,
    });

    expect(aprovarUseCase.execute).toHaveBeenCalledWith({ id: 'os-id' });
    expect(rejeitarUseCase.execute).not.toHaveBeenCalled();
    expect(result.id).toBe(os.id);
  });

  it('should call rejeitarOrcamentoUseCase when aprovado=false', async () => {
    const os = makeOs(StatusOS.CANCELADA);
    rejeitarUseCase.execute.mockResolvedValue(os);

    const result = await controller.aprovacao('os-id', {
      aprovado: false,
      motivo: 'Muito caro',
    });

    expect(rejeitarUseCase.execute).toHaveBeenCalledWith({ id: 'os-id' });
    expect(aprovarUseCase.execute).not.toHaveBeenCalled();
    expect(result.id).toBe(os.id);
  });

  it('should approve by email link when token is valid', async () => {
    const os = makeOs(StatusOS.EM_EXECUCAO);
    aprovarUseCase.execute.mockResolvedValue(os);

    const result = await controller.aprovarPorEmail('os-id', 'email-token');

    expect(aprovarUseCase.execute).toHaveBeenCalledWith({ id: 'os-id' });
    expect(result).toContain('Orcamento aprovado');
  });

  it('should reject by email link when token is valid', async () => {
    const os = makeOs(StatusOS.CANCELADA);
    rejeitarUseCase.execute.mockResolvedValue(os);

    const result = await controller.rejeitarPorEmail('os-id', 'email-token');

    expect(rejeitarUseCase.execute).toHaveBeenCalledWith({ id: 'os-id' });
    expect(result).toContain('Orcamento rejeitado');
  });

  it('should reject email link when token is invalid', async () => {
    await expect(controller.aprovarPorEmail('os-id', 'wrong')).rejects.toThrow(
      'Token de aprovacao invalido',
    );
    expect(aprovarUseCase.execute).not.toHaveBeenCalled();
  });
});
