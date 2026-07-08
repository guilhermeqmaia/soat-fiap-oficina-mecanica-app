import { OsEstoqueListener } from './os-estoque.listener';
import { OsStatusAlteradoEvent } from '../../domain/events/os-status-alterado.event';
import { StatusOS } from '../../domain/value-objects/status-os.vo';

const PRODUTOS = [
  { servicoId: 's1', produto: { produtoId: 'p1', quantidade: 2 } },
  { servicoId: 's1', produto: { produtoId: 'p2', quantidade: 1 } },
];

function makeOrdem(produtos: any[] = PRODUTOS) {
  return {
    id: 'os-1',
    numero: 'OS-2026-00001',
    usuarioId: 'user-1',
    todosOsProdutos: () => produtos,
  };
}

function setup(ordem: any) {
  const gateway = { findById: jest.fn().mockResolvedValue(ordem) };
  const estoque = {
    reservar: jest.fn().mockResolvedValue(undefined),
    baixar: jest.fn().mockResolvedValue(undefined),
    liberar: jest.fn().mockResolvedValue(undefined),
  };
  const listener = new OsEstoqueListener(gateway as any, estoque as any);
  return { listener, gateway, estoque };
}

function event(anterior: StatusOS, atual: StatusOS) {
  return new OsStatusAlteradoEvent('os-1', 'OS-2026-00001', 'c1', anterior, atual);
}

describe('OsEstoqueListener', () => {
  it('baixa o estoque de todos os produtos quando a OS entra em EM_EXECUCAO', async () => {
    const { listener, gateway, estoque } = setup(makeOrdem());

    await listener.handle(
      event(StatusOS.AGUARDANDO_APROVACAO, StatusOS.EM_EXECUCAO),
    );

    expect(gateway.findById).toHaveBeenCalledWith('os-1');
    expect(estoque.baixar).toHaveBeenCalledTimes(2);
    expect(estoque.baixar).toHaveBeenCalledWith('p1', 2, expect.any(Object));
    expect(estoque.baixar).toHaveBeenCalledWith('p2', 1, expect.any(Object));
    expect(estoque.liberar).not.toHaveBeenCalled();
  });

  it('estorna as reservas quando a OS vai de AGUARDANDO_APROVACAO para CANCELADA', async () => {
    const { listener, estoque } = setup(makeOrdem());

    await listener.handle(event(StatusOS.AGUARDANDO_APROVACAO, StatusOS.CANCELADA));

    expect(estoque.liberar).toHaveBeenCalledTimes(2);
    expect(estoque.baixar).not.toHaveBeenCalled();
  });

  it('ignora transicoes que nao afetam estoque (sem nem buscar a OS)', async () => {
    const { listener, gateway, estoque } = setup(makeOrdem());

    await listener.handle(event(StatusOS.RECEBIDA, StatusOS.EM_DIAGNOSTICO));

    expect(gateway.findById).not.toHaveBeenCalled();
    expect(estoque.baixar).not.toHaveBeenCalled();
    expect(estoque.liberar).not.toHaveBeenCalled();
  });

  it('nao estorna cancelamento que nao veio de AGUARDANDO_APROVACAO', async () => {
    const { listener, estoque } = setup(makeOrdem());

    await listener.handle(event(StatusOS.EM_DIAGNOSTICO, StatusOS.CANCELADA));

    expect(estoque.liberar).not.toHaveBeenCalled();
  });

  it('retorna cedo quando a OS nao e encontrada', async () => {
    const { listener, estoque } = setup(null);

    await listener.handle(event(StatusOS.AGUARDANDO_APROVACAO, StatusOS.EM_EXECUCAO));

    expect(estoque.baixar).not.toHaveBeenCalled();
  });

  it('nao propaga erro quando o estoque falha (fire-and-forget)', async () => {
    const gateway = { findById: jest.fn().mockResolvedValue(makeOrdem()) };
    const estoque = {
      baixar: jest.fn().mockRejectedValue(new Error('boom')),
      liberar: jest.fn(),
    };
    const listener = new OsEstoqueListener(gateway as any, estoque as any);

    await expect(
      listener.handle(event(StatusOS.AGUARDANDO_APROVACAO, StatusOS.EM_EXECUCAO)),
    ).resolves.toBeUndefined();
  });
});
