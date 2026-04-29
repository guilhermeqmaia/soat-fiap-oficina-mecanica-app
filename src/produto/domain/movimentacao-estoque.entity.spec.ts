import { MovimentacaoEstoque } from './movimentacao-estoque.entity';
import { TipoMovimentacaoEstoque } from './value-objects/tipo-movimentacao-estoque.vo';

describe('MovimentacaoEstoque', () => {
  const baseProps = {
    produtoId: 'p-1',
    tipo: TipoMovimentacaoEstoque.ENTRADA,
    quantidade: 5,
    estoqueResultante: 25,
  };

  describe('create', () => {
    it('cria movimentacao com defaults para campos opcionais', () => {
      const m = MovimentacaoEstoque.create(baseProps);

      expect(m.produtoId).toBe('p-1');
      expect(m.tipo).toBe(TipoMovimentacaoEstoque.ENTRADA);
      expect(m.quantidade).toBe(5);
      expect(m.estoqueResultante).toBe(25);
      expect(m.ordemDeServicoId).toBeNull();
      expect(m.motivo).toBeNull();
      expect(m.usuarioId).toBeNull();
    });

    it('preserva contexto opcional (OS, motivo, usuario)', () => {
      const m = MovimentacaoEstoque.create({
        ...baseProps,
        tipo: TipoMovimentacaoEstoque.RESERVA,
        ordemDeServicoId: 'os-1',
        motivo: 'Reserva para OS-2026-X',
        usuarioId: 'u-1',
      });

      expect(m.ordemDeServicoId).toBe('os-1');
      expect(m.motivo).toBe('Reserva para OS-2026-X');
      expect(m.usuarioId).toBe('u-1');
    });

    it('lanca erro quando quantidade nao eh positiva', () => {
      expect(() =>
        MovimentacaoEstoque.create({ ...baseProps, quantidade: 0 }),
      ).toThrow(/positiva/);
      expect(() =>
        MovimentacaoEstoque.create({ ...baseProps, quantidade: -1 }),
      ).toThrow(/positiva/);
    });

    it('lanca erro quando estoque resultante eh negativo', () => {
      expect(() =>
        MovimentacaoEstoque.create({ ...baseProps, estoqueResultante: -1 }),
      ).toThrow(/negativo/);
    });
  });

  describe('reconstitute', () => {
    it('restaura entidade a partir de registro persistido', () => {
      const createdAt = new Date('2026-04-27T20:00:00Z');
      const m = MovimentacaoEstoque.reconstitute({
        id: 'm-1',
        produtoId: 'p-1',
        tipo: TipoMovimentacaoEstoque.BAIXA,
        quantidade: 2,
        estoqueResultante: 10,
        ordemDeServicoId: 'os-1',
        motivo: 'baixa por execucao',
        usuarioId: 'u-1',
        createdAt,
      });

      expect(m.id).toBe('m-1');
      expect(m.tipo).toBe(TipoMovimentacaoEstoque.BAIXA);
      expect(m.createdAt).toEqual(createdAt);
    });
  });
});
