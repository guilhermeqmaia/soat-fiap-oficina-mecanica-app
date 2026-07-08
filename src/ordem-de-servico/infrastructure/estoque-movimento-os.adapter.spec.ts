import { EstoqueMovimentoOsAdapter } from './estoque-movimento-os.adapter';

describe('EstoqueMovimentoOsAdapter', () => {
  const ctx = { ordemDeServicoId: 'os-1', motivo: 'motivo', usuarioId: 'u1' };

  function setup() {
    const reservarUC = { execute: jest.fn().mockResolvedValue(undefined) };
    const baixarUC = { execute: jest.fn().mockResolvedValue(undefined) };
    const liberarUC = { execute: jest.fn().mockResolvedValue(undefined) };
    const adapter = new EstoqueMovimentoOsAdapter(
      reservarUC as any,
      baixarUC as any,
      liberarUC as any,
    );
    return { adapter, reservarUC, baixarUC, liberarUC };
  }

  it('reservar delega para ReservarEstoqueUseCase', async () => {
    const { adapter, reservarUC } = setup();
    await adapter.reservar('p1', 2, ctx);
    expect(reservarUC.execute).toHaveBeenCalledWith({
      id: 'p1',
      quantidade: 2,
      ctx,
    });
  });

  it('baixar delega para BaixarEstoqueUseCase', async () => {
    const { adapter, baixarUC } = setup();
    await adapter.baixar('p2', 3, ctx);
    expect(baixarUC.execute).toHaveBeenCalledWith({
      id: 'p2',
      quantidade: 3,
      ctx,
    });
  });

  it('liberar delega para LiberarEstoqueUseCase', async () => {
    const { adapter, liberarUC } = setup();
    await adapter.liberar('p3', 4, ctx);
    expect(liberarUC.execute).toHaveBeenCalledWith({
      id: 'p3',
      quantidade: 4,
      ctx,
    });
  });
});
