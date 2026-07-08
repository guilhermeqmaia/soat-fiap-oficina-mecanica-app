import { AtribuirMecanicoUseCase } from './atribuir-mecanico.use-case';
import { CompletarDiagnosticoUseCase } from './completar-diagnostico.use-case';
import { ConcluirServicoUseCase } from './concluir-servico.use-case';
import { FinalizarExecucaoUseCase } from './finalizar-execucao.use-case';
import { IniciarServicoUseCase } from './iniciar-servico.use-case';
import { EntregarOrdemDeServicoUseCase } from './entregar-ordem-de-servico.use-case';
import { DeletarOrdemDeServicoUseCase } from './deletar-ordem-de-servico.use-case';
import { RemoverServicoUseCase } from './remover-servico.use-case';
import { RemoverProdutoDoServicoUseCase } from './remover-produto-do-servico.use-case';
import { AprovarOrcamentoUseCase } from './aprovar-orcamento.use-case';
import { RejeitarOrcamentoUseCase } from './rejeitar-orcamento.use-case';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { OsNotOwnedByClienteError } from '../../domain/errors/os-not-owned-by-cliente.error';

function fakeOs(overrides: Record<string, any> = {}) {
  return {
    id: 'os-1',
    numero: 'OS-0001',
    clienteId: 'cli-1',
    diagnostico: 'diag',
    status: 'EM_EXECUCAO',
    valorTotalServicos: jest.fn(() => 100),
    atribuirMecanico: jest.fn(),
    completarDiagnostico: jest.fn(),
    concluirServico: jest.fn(),
    finalizarExecucao: jest.fn(),
    iniciarServico: jest.fn(),
    entregar: jest.fn(),
    removerServico: jest.fn(),
    removerProdutoDoServico: jest.fn(),
    aprovar: jest.fn(),
    rejeitar: jest.fn(),
    ...overrides,
  };
}

function gatewayWith(os: any) {
  return {
    findById: jest.fn().mockResolvedValue(os),
    update: jest.fn((o) => Promise.resolve(o)),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('OS mutation use cases', () => {
  it('AtribuirMecanico loads, mutates and persists', async () => {
    const os = fakeOs();
    const gateway = gatewayWith(os);
    await new AtribuirMecanicoUseCase(gateway as any, { publish: jest.fn() } as any).execute({
      id: 'os-1',
      usuarioId: 'mec-1',
    });
    expect(os.atribuirMecanico).toHaveBeenCalledWith('mec-1');
    expect(gateway.update).toHaveBeenCalledWith(os);
  });

  it('throws NOT_FOUND when the OS does not exist', async () => {
    const gateway = { findById: jest.fn().mockResolvedValue(null) };
    await expect(
      new AtribuirMecanicoUseCase(gateway as any, { publish: jest.fn() } as any).execute({
        id: 'nope',
        usuarioId: 'm',
      }),
    ).rejects.toBeInstanceOf(OrdemDeServicoNotFoundError);
  });

  it('CompletarDiagnostico publishes OrcamentoProntoEvent', async () => {
    const os = fakeOs();
    const gateway = gatewayWith(os);
    const events = { publish: jest.fn() };
    await new CompletarDiagnosticoUseCase(
      gateway as any,
      events as any,
    ).execute({ id: 'os-1', diagnostico: 'novo diagnostico' });
    expect(os.completarDiagnostico).toHaveBeenCalledWith('novo diagnostico');
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(events.publish.mock.calls[0][0].eventName).toBe(
      'os.orcamento-pronto',
    );
  });

  it('ConcluirServico publishes OsFinalizadaEvent only when FINALIZADA', async () => {
    const finalizada = fakeOs({ status: 'FINALIZADA' });
    const events1 = { publish: jest.fn() };
    await new ConcluirServicoUseCase(
      gatewayWith(finalizada) as any,
      events1 as any,
    ).execute({ id: 'os-1', servicoId: 's1', horasTrabalhadas: 2 });
    expect(events1.publish).toHaveBeenCalledTimes(1);

    const emExecucao = fakeOs({ status: 'EM_EXECUCAO' });
    const events2 = { publish: jest.fn() };
    await new ConcluirServicoUseCase(
      gatewayWith(emExecucao) as any,
      events2 as any,
    ).execute({ id: 'os-1', servicoId: 's1', horasTrabalhadas: 2 });
    expect(events2.publish).not.toHaveBeenCalled();
  });

  it('FinalizarExecucao publishes OsFinalizadaEvent', async () => {
    const os = fakeOs();
    const events = { publish: jest.fn() };
    await new FinalizarExecucaoUseCase(
      gatewayWith(os) as any,
      events as any,
    ).execute({ id: 'os-1' });
    expect(os.finalizarExecucao).toHaveBeenCalled();
    expect(events.publish.mock.calls[0][0].eventName).toBe('os.finalizada');
  });

  it('IniciarServico / Entregar / RemoverServico / RemoverProduto mutate and persist', async () => {
    const os = fakeOs();
    const g = gatewayWith(os);
    await new IniciarServicoUseCase(g as any).execute({
      id: 'os-1',
      servicoId: 's1',
    });
    await new EntregarOrdemDeServicoUseCase(g as any, {
      publish: jest.fn(),
    } as any).execute({ id: 'os-1' });
    await new RemoverServicoUseCase(g as any).execute({
      id: 'os-1',
      servicoId: 's1',
    });
    await new RemoverProdutoDoServicoUseCase(g as any).execute({
      id: 'os-1',
      servicoId: 's1',
      produtoId: 'p1',
    });
    expect(os.iniciarServico).toHaveBeenCalledWith('s1');
    expect(os.entregar).toHaveBeenCalled();
    expect(os.removerServico).toHaveBeenCalledWith('s1');
    expect(os.removerProdutoDoServico).toHaveBeenCalledWith('s1', 'p1');
  });

  it('Deletar removes by id (sem estorno quando o estoque ja foi baixado)', async () => {
    const os = fakeOs(); // EM_EXECUCAO -> estoque ja baixado, nao estorna
    const g = gatewayWith(os);
    const estoque = { reservar: jest.fn(), baixar: jest.fn(), liberar: jest.fn() };
    await new DeletarOrdemDeServicoUseCase(g as any, estoque as any).execute({
      id: 'os-1',
    });
    expect(g.delete).toHaveBeenCalledWith('os-1');
    expect(estoque.liberar).not.toHaveBeenCalled();
  });

  it('Deletar estorna as reservas quando a OS ainda tem estoque reservado', async () => {
    const os = fakeOs({
      status: 'EM_DIAGNOSTICO',
      todosOsProdutos: jest.fn(() => [
        { servicoId: 's1', produto: { produtoId: 'p1', quantidade: 2 } },
        { servicoId: 's1', produto: { produtoId: 'p2', quantidade: 1 } },
      ]),
    });
    const g = gatewayWith(os);
    const estoque = {
      reservar: jest.fn(),
      baixar: jest.fn(),
      liberar: jest.fn().mockResolvedValue(undefined),
    };
    await new DeletarOrdemDeServicoUseCase(g as any, estoque as any).execute({
      id: 'os-1',
    });
    expect(estoque.liberar).toHaveBeenCalledTimes(2);
    expect(estoque.liberar).toHaveBeenCalledWith('p1', 2, expect.any(Object));
    expect(estoque.liberar).toHaveBeenCalledWith('p2', 1, expect.any(Object));
    expect(g.delete).toHaveBeenCalledWith('os-1');
  });

  describe('Aprovar/Rejeitar ownership', () => {
    it('approves without ownership check when no client email is given', async () => {
      const os = fakeOs({ status: 'AGUARDANDO_APROVACAO' });
      const g = gatewayWith(os);
      const clienteGateway = { findById: jest.fn(), findByCpfCnpj: jest.fn() };
      await new AprovarOrcamentoUseCase(g as any, clienteGateway as any, {
        publish: jest.fn(),
      } as any).execute(
        { id: 'os-1' },
      );
      expect(os.aprovar).toHaveBeenCalled();
      expect(clienteGateway.findById).not.toHaveBeenCalled();
    });

    it('rejects with FORBIDDEN when the OS does not belong to the authenticated client', async () => {
      const os = fakeOs({ status: 'AGUARDANDO_APROVACAO', clienteId: 'cli-1' });
      const g = gatewayWith(os);
      const clienteGateway = {
        findById: jest.fn().mockResolvedValue({ email: 'dono@x.com' }),
        findByCpfCnpj: jest.fn(),
      };
      await expect(
        new RejeitarOrcamentoUseCase(g as any, clienteGateway as any, {
          publish: jest.fn(),
        } as any).execute({
          id: 'os-1',
          emailClienteAutenticado: 'intruso@x.com',
        }),
      ).rejects.toBeInstanceOf(OsNotOwnedByClienteError);
      expect(os.rejeitar).not.toHaveBeenCalled();
    });

    it('approves when the authenticated client owns the OS', async () => {
      const os = fakeOs({ status: 'AGUARDANDO_APROVACAO' });
      const g = gatewayWith(os);
      const clienteGateway = {
        findById: jest.fn().mockResolvedValue({ email: 'Dono@x.com' }),
        findByCpfCnpj: jest.fn(),
      };
      await new AprovarOrcamentoUseCase(g as any, clienteGateway as any, {
        publish: jest.fn(),
      } as any).execute(
        { id: 'os-1', emailClienteAutenticado: 'dono@x.com' },
      );
      expect(os.aprovar).toHaveBeenCalled();
    });
  });
});
