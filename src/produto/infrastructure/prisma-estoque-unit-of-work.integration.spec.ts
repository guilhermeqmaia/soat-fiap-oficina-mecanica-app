import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaEstoqueUnitOfWork } from './prisma-estoque-unit-of-work';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { ProdutoNotFoundError } from '../domain/errors/produto-not-found.error';
import {
  startTestDatabase,
  stopTestDatabase,
} from '../../test/database.container';

jest.setTimeout(60000);

describe('PrismaEstoqueUnitOfWork (integration)', () => {
  let prisma: PrismaService;
  let uow: PrismaEstoqueUnitOfWork;

  beforeAll(async () => {
    const databaseUrl = await startTestDatabase();
    process.env.DATABASE_URL = databaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, PrismaEstoqueUnitOfWork],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    uow = module.get<PrismaEstoqueUnitOfWork>(PrismaEstoqueUnitOfWork);

    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await prisma.movimentacaoEstoque.deleteMany();
    await prisma.produto.deleteMany();
  });

  async function criarProduto(quantidadeEstoque: number, quantidadeReservada = 0) {
    return prisma.produto.create({
      data: {
        nome: 'Peca',
        precoUnitario: 10,
        quantidadeEstoque,
        quantidadeReservada,
        estoqueMinimo: 1,
      },
    });
  }

  it('reserva de forma atomica e registra a movimentacao', async () => {
    const produto = await criarProduto(10);

    const result = await uow.mutarComMovimentacao({
      produtoId: produto.id,
      tipo: TipoMovimentacaoEstoque.RESERVA,
      quantidade: 4,
      ctx: { motivo: 'teste' },
      aplicar: (p) => p.reserve(4),
    });

    expect(result.quantidadeReservada).toBe(4);

    const fresh = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(fresh!.quantidadeReservada).toBe(4);

    const movs = await prisma.movimentacaoEstoque.count({
      where: { produtoId: produto.id },
    });
    expect(movs).toBe(1);
  });

  it('faz rollback e nao registra movimentacao quando a invariante falha', async () => {
    const produto = await criarProduto(3);

    await expect(
      uow.mutarComMovimentacao({
        produtoId: produto.id,
        tipo: TipoMovimentacaoEstoque.RESERVA,
        quantidade: 5, // > disponivel
        ctx: {},
        aplicar: (p) => p.reserve(5),
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const fresh = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(fresh!.quantidadeReservada).toBe(0);
    const movs = await prisma.movimentacaoEstoque.count({
      where: { produtoId: produto.id },
    });
    expect(movs).toBe(0);
  });

  it('throws ProdutoNotFoundError quando o produto nao existe', async () => {
    await expect(
      uow.mutarComMovimentacao({
        produtoId: '00000000-0000-0000-0000-000000000000',
        tipo: TipoMovimentacaoEstoque.RESERVA,
        quantidade: 1,
        ctx: {},
        aplicar: (p) => p.reserve(1),
      }),
    ).rejects.toBeInstanceOf(ProdutoNotFoundError);
  });

  it('nao permite overselling sob reservas concorrentes (trava pessimista)', async () => {
    const produto = await criarProduto(10); // disponivel = 10

    // Duas reservas concorrentes de 6 cada: somadas (12) excedem o estoque.
    // A trava FOR UPDATE serializa: uma reserva, a outra ve reservada=6 e falha.
    const results = await Promise.allSettled([
      uow.mutarComMovimentacao({
        produtoId: produto.id,
        tipo: TipoMovimentacaoEstoque.RESERVA,
        quantidade: 6,
        ctx: {},
        aplicar: (p) => p.reserve(6),
      }),
      uow.mutarComMovimentacao({
        produtoId: produto.id,
        tipo: TipoMovimentacaoEstoque.RESERVA,
        quantidade: 6,
        ctx: {},
        aplicar: (p) => p.reserve(6),
      }),
    ]);

    const sucessos = results.filter((r) => r.status === 'fulfilled');
    const falhas = results.filter((r) => r.status === 'rejected');

    expect(sucessos).toHaveLength(1);
    expect(falhas).toHaveLength(1);
    expect((falhas[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InsufficientStockError,
    );

    const fresh = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(fresh!.quantidadeReservada).toBe(6); // e nao 12

    const movs = await prisma.movimentacaoEstoque.count({
      where: { produtoId: produto.id },
    });
    expect(movs).toBe(1); // somente a reserva bem-sucedida gerou movimentacao
  });
});
