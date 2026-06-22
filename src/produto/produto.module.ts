import { Module } from '@nestjs/common';
import { EstoqueBaixoListener } from './application/listeners/estoque-baixo.listener';
import { ProdutoController } from './infrastructure/produto.controller';
import { PrismaProdutoRepository } from './infrastructure/prisma-produto.repository';
import { PrismaMovimentacaoEstoqueRepository } from './infrastructure/prisma-movimentacao-estoque.repository';
import { PrismaEstoqueUnitOfWork } from './infrastructure/prisma-estoque-unit-of-work';
import { PRODUTO_REPOSITORY } from './domain/produto.repository';
import { MOVIMENTACAO_ESTOQUE_REPOSITORY } from './domain/movimentacao-estoque.repository';
import { ESTOQUE_UNIT_OF_WORK } from './domain/estoque-unit-of-work';
import { PRODUTO_GATEWAY } from './application/gateways/produto.gateway';
import { MOVIMENTACAO_ESTOQUE_GATEWAY } from './application/gateways/movimentacao-estoque.gateway';
import { CriarProdutoUseCase } from './application/use-cases/criar-produto.use-case';
import { ListarProdutosUseCase } from './application/use-cases/listar-produtos.use-case';
import { BuscarProdutoPorIdUseCase } from './application/use-cases/buscar-produto-por-id.use-case';
import { ListarProdutosEstoqueBaixoUseCase } from './application/use-cases/listar-produtos-estoque-baixo.use-case';
import { AtualizarProdutoUseCase } from './application/use-cases/atualizar-produto.use-case';
import { DeletarProdutoUseCase } from './application/use-cases/deletar-produto.use-case';
import { AdicionarEstoqueUseCase } from './application/use-cases/adicionar-estoque.use-case';
import { RemoverEstoqueUseCase } from './application/use-cases/remover-estoque.use-case';
import { ReservarEstoqueUseCase } from './application/use-cases/reservar-estoque.use-case';
import { LiberarEstoqueUseCase } from './application/use-cases/liberar-estoque.use-case';
import { BaixarEstoqueUseCase } from './application/use-cases/baixar-estoque.use-case';
import { ListarMovimentacoesUseCase } from './application/use-cases/listar-movimentacoes.use-case';

@Module({
  controllers: [ProdutoController],
  providers: [
    // Infrastructure adapters (registered as class tokens so useExisting can reference them)
    PrismaProdutoRepository,
    PrismaMovimentacaoEstoqueRepository,
    PrismaEstoqueUnitOfWork,

    // Domain repository tokens (kept for OrdemDeServico module dependency on PRODUTO_REPOSITORY)
    { provide: PRODUTO_REPOSITORY, useExisting: PrismaProdutoRepository },
    { provide: MOVIMENTACAO_ESTOQUE_REPOSITORY, useExisting: PrismaMovimentacaoEstoqueRepository },
    { provide: ESTOQUE_UNIT_OF_WORK, useExisting: PrismaEstoqueUnitOfWork },

    // Gateway tokens (consumed by use cases — point to the same Prisma adapters)
    { provide: PRODUTO_GATEWAY, useExisting: PrismaProdutoRepository },
    { provide: MOVIMENTACAO_ESTOQUE_GATEWAY, useExisting: PrismaMovimentacaoEstoqueRepository },

    // Use cases
    CriarProdutoUseCase,
    ListarProdutosUseCase,
    BuscarProdutoPorIdUseCase,
    ListarProdutosEstoqueBaixoUseCase,
    AtualizarProdutoUseCase,
    DeletarProdutoUseCase,
    AdicionarEstoqueUseCase,
    RemoverEstoqueUseCase,
    ReservarEstoqueUseCase,
    LiberarEstoqueUseCase,
    BaixarEstoqueUseCase,
    ListarMovimentacoesUseCase,

    // Listeners
    EstoqueBaixoListener,
  ],
  exports: [
    PRODUTO_REPOSITORY,
    PRODUTO_GATEWAY,
    ESTOQUE_UNIT_OF_WORK,
    AdicionarEstoqueUseCase,
    RemoverEstoqueUseCase,
    ReservarEstoqueUseCase,
    LiberarEstoqueUseCase,
    BaixarEstoqueUseCase,
  ],
})
export class ProdutoModule {}
