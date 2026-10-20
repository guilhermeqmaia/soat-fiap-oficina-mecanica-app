import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { criarEnvelope } from '@guilhermeqmaia/oficina-kit/messaging';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';
import {
  RegistrarCancelamentoUseCase,
  RegistrarDiagnosticoUseCase,
  RegistrarEnfileiramentoUseCase,
  RegistrarExecucaoFinalizadaUseCase,
  RegistrarExecucaoIniciadaUseCase,
  RegistrarOrcamentoAprovadoUseCase,
  RegistrarOrcamentoGeradoUseCase,
} from '../../application/use-cases/transicoes';
import { OS_MESSAGE_HANDLERS } from './index';
import { ItemDiagnosticoInput } from '../../application/use-cases/transicoes/registrar-diagnostico.use-case';
import {
  BillingOrcamentoAprovadoHandler,
  BillingOrcamentoGeradoHandler,
  BillingOrcamentoRejeitadoHandler,
  BillingPagamentoAprovadoHandler,
  BillingPagamentoRecusadoHandler,
  ExecucaoDiagnosticoConcluidoHandler,
  ExecucaoEnfileiradaHandler,
  ExecucaoFinalizadaHandler,
  ExecucaoIniciadaHandler,
  ExecucaoRecusadaHandler,
} from './eventos.handlers';

const env = <T>(type: string, data: T) => criarEnvelope({ type, data, producer: 'execucao-service', correlationId: 'OS-1' });
const uc = () => ({ execute: jest.fn().mockResolvedValue(undefined) });

describe('handlers da fila os-eventos', () => {
  const ucs = {
    enfileiramento: uc(), cancelamento: uc(), diagnostico: uc(), iniciada: uc(), finalizada: uc(), orcamentoGerado: uc(), orcamentoAprovado: uc(),
  };
  let get: <T>(cls: new (...a: any[]) => T) => T;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ...OS_MESSAGE_HANDLERS,
        { provide: RegistrarEnfileiramentoUseCase, useValue: ucs.enfileiramento },
        { provide: RegistrarCancelamentoUseCase, useValue: ucs.cancelamento },
        { provide: RegistrarDiagnosticoUseCase, useValue: ucs.diagnostico },
        { provide: RegistrarExecucaoIniciadaUseCase, useValue: ucs.iniciada },
        { provide: RegistrarExecucaoFinalizadaUseCase, useValue: ucs.finalizada },
        { provide: RegistrarOrcamentoGeradoUseCase, useValue: ucs.orcamentoGerado },
        { provide: RegistrarOrcamentoAprovadoUseCase, useValue: ucs.orcamentoAprovado },
      ],
    }).compile();
    get = (cls) => module.get(cls);
  });
  beforeEach(() => jest.clearAllMocks());

  it('cobre todos os types assinados na fila, sem duplicatas', () => {
    const types = OS_MESSAGE_HANDLERS.map((h) => get<{ type: string }>(h as any).type);
    expect(new Set(types).size).toBe(types.length);
    expect(types.sort()).toEqual([
      'billing.orcamento-aprovado', 'billing.orcamento-cancelado', 'billing.orcamento-gerado', 'billing.orcamento-rejeitado', 'billing.pagamento-aprovado', 'billing.pagamento-recusado',
      'execucao.diagnostico-concluido', 'execucao.enfileirada', 'execucao.finalizada', 'execucao.iniciada', 'execucao.recusada', 'execucao.reservas-liberadas',
    ]);
  });

  it('execucao.enfileirada / iniciada / finalizada -> transicoes pelo numero da OS', async () => {
    await get(ExecucaoEnfileiradaHandler).handle(env('execucao.enfileirada', { numeroOS: 'OS-1', posicaoFila: 3 }));
    await get(ExecucaoIniciadaHandler).handle(env('execucao.iniciada', { numeroOS: 'OS-1' }));
    await get(ExecucaoFinalizadaHandler).handle(env('execucao.finalizada', { numeroOS: 'OS-1', finalizadaEm: new Date().toISOString() }));
    expect(ucs.enfileiramento.execute).toHaveBeenCalledWith({ numero: 'OS-1' });
    expect(ucs.iniciada.execute).toHaveBeenCalledWith({ numero: 'OS-1' });
    expect(ucs.finalizada.execute).toHaveBeenCalledWith({ numero: 'OS-1' });
  });

  it('execucao.diagnostico-concluido repassa mecanico, diagnostico e itens do contrato', async () => {
    const itens: ItemDiagnosticoInput[] = [{ tipo: 'SERVICO', referenciaId: 's1', nome: 'Troca', quantidade: 1, precoUnitario: '200.00' }];
    await get(ExecucaoDiagnosticoConcluidoHandler).handle(env('execucao.diagnostico-concluido', { numeroOS: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas gastas', itens }));
    expect(ucs.diagnostico.execute).toHaveBeenCalledWith({ numero: 'OS-1', mecanicoId: 'm', diagnostico: 'Pastilhas gastas', itens });
  });

  it('billing.orcamento-gerado / aprovado', async () => {
    await get(BillingOrcamentoGeradoHandler).handle(env('billing.orcamento-gerado', { numeroOS: 'OS-1', orcamentoId: 'o1', total: '315.00', validoAte: '' }));
    await get(BillingOrcamentoAprovadoHandler).handle(env('billing.orcamento-aprovado', { numeroOS: 'OS-1', orcamentoId: 'o1', cobrancaId: 'c1', linkPagamento: 'https://mp' }));
    expect(ucs.orcamentoGerado.execute).toHaveBeenCalledWith({ numero: 'OS-1', total: '315.00' });
    expect(ucs.orcamentoAprovado.execute).toHaveBeenCalledWith({ numero: 'OS-1' });
  });

  it('compensacoes: recusada / rejeitado / pagamento-recusado cancelam com o motivo certo', async () => {
    await get(ExecucaoRecusadaHandler).handle(env('execucao.recusada', { numeroOS: 'OS-1', motivo: 'veiculo em execucao' }));
    await get(BillingOrcamentoRejeitadoHandler).handle(env('billing.orcamento-rejeitado', { numeroOS: 'OS-1', orcamentoId: 'o1' }));
    await get(BillingPagamentoRecusadoHandler).handle(env('billing.pagamento-recusado', { numeroOS: 'OS-1', cobrancaId: 'c1', motivo: 'cc' }));
    expect(ucs.cancelamento.execute.mock.calls.map((c) => c[0].motivo)).toEqual([
      MotivoCancelamento.EXECUCAO_RECUSADA, MotivoCancelamento.ORCAMENTO_REJEITADO, MotivoCancelamento.PAGAMENTO_RECUSADO,
    ]);
  });

  it('eventos sem transicao (pagamento-aprovado etc.) so registram no log e confirmam', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await expect(get(BillingPagamentoAprovadoHandler).handle(env('billing.pagamento-aprovado', { numeroOS: 'OS-1' }))).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'billing.pagamento-aprovado', numeroOS: 'OS-1' }));
    expect(Object.values(ucs).some((u) => u.execute.mock.calls.length > 0)).toBe(false);
    log.mockRestore();
  });

  it('erro do use case propaga (o consumer nao confirma -> retry -> DLQ)', async () => {
    ucs.iniciada.execute.mockRejectedValueOnce(new Error('transicao invalida'));
    await expect(get(ExecucaoIniciadaHandler).handle(env('execucao.iniciada', { numeroOS: 'OS-1' }))).rejects.toThrow('transicao invalida');
  });
});
